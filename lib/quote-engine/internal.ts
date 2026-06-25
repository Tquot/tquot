import type { ParsedTripInputV2, TripLeg, BudgetConstraint } from "./schemas-v2";
import type {
  ParsedTripInput,
  Quote,
  QuoteItem,
  HotelLevel,
  QuoteDataSource,
} from "@/lib/quotes/build-quote";
import {
  buildQuote,
  syncQuotePricing,
} from "@/lib/quotes/build-quote";
import type { Flight, Hotel, Experience, Transfer } from "./types";
import { parseHotelNightsFromTitle } from "@/lib/hotels/parse-hotel-title";

export interface SearchContext {
  apiOrigin?: string;
  cookieHeader?: string;
}

const TIER_TO_HOTEL_LEVEL: Record<
  Extract<BudgetConstraint, { kind: "tier" }>["tier"],
  HotelLevel
> = {
  budget: "budget",
  mid: "standard",
  premium: "premium",
  luxury: "luxury",
};

function hotelLevelFromBudget(budget: BudgetConstraint): HotelLevel {
  if (budget.kind === "tier") {
    return TIER_TO_HOTEL_LEVEL[budget.tier];
  }
  return "standard";
}

export function v2LegToParsedTripInput(
  leg: TripLeg,
  parsed: ParsedTripInputV2,
  legIndex: number,
  options: {
    includeFlights?: boolean;
    includeHotels?: boolean;
    includeExperiences?: boolean;
  },
): ParsedTripInput {
  const origin =
    leg.origin?.trim() ||
    (legIndex > 0 ? parsed.legs[legIndex - 1]?.destination : "") ||
    "MAD";

  const mergedPrefs = {
    ...parsed.preferences,
    ...leg.legPreferences,
  };

  return {
    origin,
    destination: leg.destination,
    dates: {
      start: leg.arrivalDate,
      end: leg.departureDate,
    },
    passengers: {
      adults: parsed.travelers.adults,
      children: parsed.travelers.children.length,
    },
    preferences: {
      hotelLevel: hotelLevelFromBudget(parsed.budget),
      directFlights: mergedPrefs.themes.some((t) => /vuelos directos/i.test(t)),
      accessibility: mergedPrefs.accessibility.length > 0,
    },
    includeHotels: options.includeHotels ?? leg.needsAccommodation,
    includeExperiences: options.includeExperiences ?? true,
    includeFlights: options.includeFlights ?? leg.needsTransport === "flight",
    locale: "es",
  };
}

type TaggedQuoteItem = QuoteItem & { legId: string };

function tagItems(items: QuoteItem[], legId: string): TaggedQuoteItem[] {
  return items.map((item) => ({ ...item, legId }));
}

export async function searchHotels(
  leg: TripLeg,
  parsed: ParsedTripInputV2,
  legIndex: number,
  ctx: SearchContext,
): Promise<Hotel[]> {
  const v1 = v2LegToParsedTripInput(leg, parsed, legIndex, {
    includeFlights: false,
    includeExperiences: false,
    includeHotels: true,
  });
  const quote = await buildQuote(v1, ctx.apiOrigin ?? "", ctx.cookieHeader);
  return quote.hotels.map((item) => quoteItemToHotel(item, leg.id));
}

export async function searchExperiences(
  leg: TripLeg,
  parsed: ParsedTripInputV2,
  legIndex: number,
  ctx: SearchContext,
): Promise<Experience[]> {
  const v1 = v2LegToParsedTripInput(leg, parsed, legIndex, {
    includeFlights: false,
    includeHotels: false,
    includeExperiences: true,
  });
  const quote = await buildQuote(v1, ctx.apiOrigin ?? "", ctx.cookieHeader);
  return quote.experiences.map((item) => quoteItemToExperience(item, leg.id));
}

export async function searchTransfers(
  leg: TripLeg,
  parsed: ParsedTripInputV2,
  legIndex: number,
  ctx: SearchContext,
): Promise<Transfer[]> {
  const v1 = v2LegToParsedTripInput(leg, parsed, legIndex, {
    includeFlights: true,
    includeHotels: false,
    includeExperiences: false,
  });
  const quote = await buildQuote(v1, ctx.apiOrigin ?? "", ctx.cookieHeader);
  return quote.transfers.map((item) => quoteItemToTransfer(item, leg.id));
}

export async function searchFlights(
  params: {
    origin: string;
    destination: string;
    date: string;
    travelers: ParsedTripInputV2["travelers"];
  },
  legId: string,
  ctx: SearchContext,
): Promise<Flight[]> {
  const v1: ParsedTripInput = {
    origin: params.origin,
    destination: params.destination,
    dates: {
      start: params.date,
      end: params.date,
    },
    passengers: {
      adults: params.travelers.adults,
      children: params.travelers.children.length,
    },
    preferences: {
      hotelLevel: "standard",
      directFlights: false,
      accessibility: false,
    },
    includeHotels: false,
    includeExperiences: false,
    includeFlights: true,
    locale: "es",
  };
  const quote = await buildQuote(v1, ctx.apiOrigin ?? "", ctx.cookieHeader);
  return quote.flights.map((item) => quoteItemToFlight(item, legId));
}

function quoteItemToHotel(item: QuoteItem, legId: string): Hotel {
  const nights = parseHotelNightsFromTitle(item.title) ?? 1;
  let provider: Hotel["provider"] = "own";
  if (item.source === "api") {
    const slug = item.hotelDetails?.provider ?? item.provider.toLowerCase();
    if (slug.includes("booking")) provider = "booking";
    else provider = "hotelbeds";
  }

  return {
    id: item.id,
    legId,
    name: item.title.split(" — ")[0] ?? item.title,
    netPrice: item.hotelDetails?.netPrice ?? item.price / Math.max(1, nights),
    currency: item.hotelDetails?.currency ?? "EUR",
    nights,
    stars: 0,
    provider,
    fetchedAt: item.hotelDetails?.fetchedAt ?? new Date().toISOString(),
    hotelCode: item.hotelDetails?.hotelCode,
    rateKey: item.hotelDetails?.rateKey,
  };
}

function quoteItemToFlight(item: QuoteItem, legId: string): Flight {
  return {
    id: item.id,
    legId,
    carrier: item.flightDetails?.airline ?? item.provider,
    carrierName: item.flightDetails?.airline ?? item.provider,
    price: item.price,
    currency: "EUR",
    origin: item.flightDetails?.originIata ?? item.flightDetails?.originCity,
    destination:
      item.flightDetails?.destinationIata ?? item.flightDetails?.destinationCity,
    offerId: item.flightDetails?.selectedOfferId ?? item.flightDetails?.primaryOfferId,
  };
}

function quoteItemToExperience(item: QuoteItem, legId: string): Experience {
  return {
    id: item.id,
    legId,
    name: item.title,
    price: item.price,
    currency: "EUR",
    provider: item.provider,
  };
}

function quoteItemToTransfer(item: QuoteItem, legId: string): Transfer {
  return {
    id: item.id,
    legId,
    price: item.price,
    currency: "EUR",
    provider: item.provider,
    pickupLocation: item.transferDetails?.pickupLocation,
    dropoffLocation: item.transferDetails?.dropoffLocation,
  };
}

function hotelToQuoteItem(hotel: Hotel): QuoteItem & { legId: string } {
  const price = hotel.netPrice * hotel.nights;
  const hotelProvider =
    hotel.provider === "own"
      ? undefined
      : (hotel.provider as "hotelbeds" | "booking");

  return {
    id: hotel.id,
    legId: hotel.legId,
    type: "hotel",
    title: hotel.name,
    description: `${hotel.nights} noches`,
    price,
    markup: 0,
    finalPrice: price,
    provider: hotel.provider,
    source: hotel.provider === "own" ? "inventory" : "api",
    hotelDetails: {
      netPrice: hotel.netPrice,
      currency: hotel.currency,
      provider: hotelProvider,
      hotelCode: hotel.hotelCode,
      rateKey: hotel.rateKey,
      fetchedAt: hotel.fetchedAt,
    },
  };
}

function flightToQuoteItem(flight: Flight): QuoteItem & { legId: string } {
  return {
    id: flight.id,
    legId: flight.legId,
    type: "flight",
    title: `${flight.carrier} ${flight.origin ?? ""} → ${flight.destination ?? ""}`.trim(),
    description: flight.carrierName ?? flight.carrier,
    price: flight.price,
    markup: 0,
    finalPrice: flight.price,
    provider: flight.carrier,
    source: "api",
    flightDetails: {
      departureDate: "",
      departureTime: "",
      arrivalTime: "",
      duration: "",
      originIata: flight.origin ?? "",
      destinationIata: flight.destination ?? "",
      originCity: flight.origin ?? "",
      destinationCity: flight.destination ?? "",
      airline: flight.carrierName ?? flight.carrier,
      airlineLogoUrl: "",
      flightNumber: "",
      cabinClass: "",
      baggageIncluded: "",
      layovers: [],
      stops: 0,
      priceNumeric: flight.price,
      selectedOfferId: flight.offerId,
      primaryOfferId: flight.offerId,
    },
  };
}

export function sectionResultsToQuoteItems(
  section: import("@/lib/quote-conversation/types").QuoteSection,
  results: unknown[],
): QuoteItem[] {
  switch (section) {
    case "flights":
      return (results as Flight[]).map(flightToQuoteItem);
    case "hotels":
      return (results as Hotel[]).map(hotelToQuoteItem);
    case "experiences":
      return (results as Experience[]).map(experienceToQuoteItem);
    case "transfers":
      return (results as Transfer[]).map(transferToQuoteItem);
  }
}

function experienceToQuoteItem(exp: Experience): QuoteItem & { legId: string } {
  return {
    id: exp.id,
    legId: exp.legId,
    type: "experience",
    title: exp.name,
    description: exp.name,
    price: exp.price,
    markup: 0,
    finalPrice: exp.price,
    provider: exp.provider ?? "experience",
    source: "api",
  };
}

function transferToQuoteItem(transfer: Transfer): QuoteItem & { legId: string } {
  return {
    id: transfer.id,
    legId: transfer.legId,
    type: "transfer",
    title: `${transfer.pickupLocation ?? "Origen"} → ${transfer.dropoffLocation ?? "Destino"}`,
    description: transfer.provider ?? "transfer",
    price: transfer.price,
    markup: 0,
    finalPrice: transfer.price,
    provider: transfer.provider ?? "transfer",
    source: "api",
    transferDetails: {
      pickupLocation: transfer.pickupLocation,
      dropoffLocation: transfer.dropoffLocation,
    },
  };
}

function quoteSectionSource(items: QuoteItem[]): QuoteDataSource {
  if (items.length === 0) return "real";
  return items.every((item) => item.source === "mock") ? "mock" : "real";
}

export function composeQuote(
  parsed: ParsedTripInputV2,
  sections: {
    flights: Flight[];
    hotels: Hotel[];
    experiences: Experience[];
    transfers: Transfer[];
  },
): Quote {
  const flights = sections.flights.map(flightToQuoteItem);
  const hotels = sections.hotels.map(hotelToQuoteItem);
  const experiences = sections.experiences.map(experienceToQuoteItem);
  const transfers = sections.transfers.map(transferToQuoteItem);

  const route =
    parsed.legs.length === 1
      ? `${parsed.legs[0].origin ?? "?"} → ${parsed.legs[0].destination}`
      : parsed.legs
          .map((leg, i) => {
            const from = leg.origin ?? (i > 0 ? parsed.legs[i - 1].destination : "?");
            return `${from} → ${leg.destination}`;
          })
          .join(" · ");

  const totalDays = parsed.legs.reduce((sum, leg) => {
    const arr = new Date(leg.arrivalDate).getTime();
    const dep = new Date(leg.departureDate).getTime();
    return sum + Math.max(1, Math.round((dep - arr) / 86_400_000) + 1);
  }, 0);

  const quote: Quote = {
    id: `quote-${Date.now()}`,
    summary: {
      route,
      durationDays: totalDays,
      passengers: {
        adults: parsed.travelers.adults,
        children: parsed.travelers.children.length,
        total: parsed.travelers.adults + parsed.travelers.children.length,
      },
    },
    flights,
    transfers,
    hotels,
    experiences,
    pricing: {
      baseTotal: 0,
      margin: 0,
      finalTotal: 0,
      currency: "EUR",
    },
    _meta: {
      flightsSource: quoteSectionSource(flights),
      transfersSource: quoteSectionSource(transfers),
      hotelsSource: quoteSectionSource(hotels),
      experiencesSource: quoteSectionSource(experiences),
    },
  };

  syncQuotePricing(quote);
  return quote;
}

import type { ParsedTripInputV2, TripLeg, BudgetConstraint } from "./schemas-v2";
import type {
  ParsedTripInput,
  Quote,
  QuoteItem,
  HotelLevel,
  QuoteDataSource,
} from "@/lib/quotes/build-quote";
import type { QuoteGroupDistribution } from "./types";
import {
  buildQuote,
  syncQuotePricing,
} from "@/lib/quotes/build-quote";

export interface SearchContext {
  apiOrigin?: string;
  cookieHeader?: string;
}

export type TaggedQuoteItem = QuoteItem & { legId: string };

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
    hotelbedsGroupDistribution?: QuoteGroupDistribution;
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
    hotelbedsGroupDistribution: options.hotelbedsGroupDistribution
      ? {
          doubles: options.hotelbedsGroupDistribution.doubles,
          singles: options.hotelbedsGroupDistribution.singles,
          triples: options.hotelbedsGroupDistribution.triples,
        }
      : undefined,
  };
}

function tagItems(items: QuoteItem[], legId: string): TaggedQuoteItem[] {
  return items.map((item) => ({ ...item, legId }));
}

export async function searchHotels(
  leg: TripLeg,
  parsed: ParsedTripInputV2,
  legIndex: number,
  ctx: SearchContext,
  hotelbedsGroupDistribution?: QuoteGroupDistribution,
): Promise<TaggedQuoteItem[]> {
  const v1 = v2LegToParsedTripInput(leg, parsed, legIndex, {
    includeFlights: false,
    includeExperiences: false,
    includeHotels: true,
    hotelbedsGroupDistribution,
  });
  const quote = await buildQuote(v1, ctx.apiOrigin ?? "", ctx.cookieHeader);
  return tagItems(quote.hotels, leg.id);
}

export async function searchExperiences(
  leg: TripLeg,
  parsed: ParsedTripInputV2,
  legIndex: number,
  ctx: SearchContext,
): Promise<TaggedQuoteItem[]> {
  const v1 = v2LegToParsedTripInput(leg, parsed, legIndex, {
    includeFlights: false,
    includeHotels: false,
    includeExperiences: true,
  });
  const quote = await buildQuote(v1, ctx.apiOrigin ?? "", ctx.cookieHeader);
  return tagItems(quote.experiences, leg.id);
}

export async function searchTransfers(
  leg: TripLeg,
  parsed: ParsedTripInputV2,
  legIndex: number,
  ctx: SearchContext,
): Promise<TaggedQuoteItem[]> {
  const v1 = v2LegToParsedTripInput(leg, parsed, legIndex, {
    includeFlights: true,
    includeHotels: false,
    includeExperiences: false,
  });
  const quote = await buildQuote(v1, ctx.apiOrigin ?? "", ctx.cookieHeader);
  return tagItems(quote.transfers, leg.id);
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
): Promise<TaggedQuoteItem[]> {
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
  return tagItems(quote.flights, legId);
}

export function sectionResultsToQuoteItems(
  _section: import("@/lib/quote-conversation/types").QuoteSection,
  results: unknown[],
): QuoteItem[] {
  return results as QuoteItem[];
}

function quoteSectionSource(items: QuoteItem[]): QuoteDataSource {
  if (items.length === 0) return "real";
  return items.every((item) => item.source === "mock") ? "mock" : "real";
}

export function composeQuote(
  parsed: ParsedTripInputV2,
  sections: {
    flights: TaggedQuoteItem[];
    hotels: TaggedQuoteItem[];
    experiences: TaggedQuoteItem[];
    transfers: TaggedQuoteItem[];
  },
): Quote {
  const { flights, hotels, experiences, transfers } = sections;

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

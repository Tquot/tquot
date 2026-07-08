/**
 * Quote builder: flights and hotels from search APIs when available, mock fallback otherwise.
 */

import type {
  FlightFareOption,
  FlightOption,
} from "@/app/api/search-flights/route";
import type { ExperienceOption } from "@/app/api/search-experiences-hotelbeds/route";
import type { TransferOption } from "@/app/api/search-transfers-hotelbeds/route";
import type { HotelOption } from "@/app/api/search-hotels/route";
import {
  resolveTransferLocationLabels,
  shouldIncludeTransfers,
} from "@/lib/quotes/transfer-eligibility";
import { getCityIATA } from "@/lib/airports";
import type { DuffelLocale } from "@/lib/duffel/flights";
import { buildFlightSearchParams } from "@/lib/flights/build-search-params";
import { matchesExperienceDurationForTrip } from "@/lib/inventory/experience-duration";
import {
  resolveInventoryNetPrice,
  resolveInventoryProvider,
} from "@/lib/inventory/inventory-utils";
import type { InventoryQuoteRow } from "@/lib/inventory/search-for-quote";
import type { EnrichedTripRequest } from "@/lib/parser/airport-resolution";
import { providerSlug } from "@/lib/connectors/provider-logo";

// ─────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────

export type HotelLevel = "budget" | "standard" | "premium" | "luxury";

export type AgencyMarginCategory =
  | "vuelos"
  | "hoteles"
  | "experiencias"
  | "transfers"
  | "seguros";

export type AgencyMargins = Partial<Record<AgencyMarginCategory, number>>;

export type AirportFlightChoices = {
  origin: string | "all";
  destination: string | "all";
};

export interface ParsedTripInput {
  origin: string;
  destination: string;
  dates: {
    start: string;
    end: string;
  };
  passengers: {
    adults: number;
    children: number;
  };
  budget?: number;
  preferences: {
    hotelLevel: HotelLevel;
    directFlights: boolean;
    accessibility: boolean;
  };
  agencyMargins?: AgencyMargins;
  enrichedTrip?: EnrichedTripRequest;
  airportChoices?: AirportFlightChoices;
  includeHotels: boolean;
  includeExperiences: boolean;
  includeFlights: boolean;
  /** Localizes Duffel flight search strings (baggage, cabin class). */
  locale?: DuffelLocale;

  /**
   * Cuando el usuario solicita un viaje en grupo, este payload permite a
   * Hotelbeds consultar ocupaciones multi-habitación.
   *
   * Usado únicamente para búsquedas de hotelbeds (no afecta a vuelos/transfer).
   */
  hotelbedsGroupDistribution?: {
    doubles: number;
    singles: number;
    triples: number;
  };
}

// ─────────────────────────────────────────────────────────────
// Output
// ─────────────────────────────────────────────────────────────

export type QuoteItemType = "flight" | "hotel" | "experience" | "transfer";
export type QuoteItemSource = "mock" | "inventory" | "api";

export type QuoteItemFlightDetails = {
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  originIata: string;
  destinationIata: string;
  originCity: string;
  destinationCity: string;
  airline: string;
  airlineLogoUrl: string;
  flightNumber: string;
  cabinClass: string;
  baggageIncluded: string;
  layovers: Array<{ airport: string; iata: string; duration: string }>;
  stops: number;
  priceNumeric: number;
  fareName?: string;
  selectedOfferId?: string;
  fareOptions?: FlightFareOption[];
  /** Cheapest fare snapshot (Duffel grouping primary). */
  primaryOfferId?: string;
  primaryPriceNumeric?: number;
  primaryCabinClass?: string;
  primaryBaggageIncluded?: string;
  primaryFareName?: string;
};

export type QuoteItemHotelDetails = {
  hotelCode?: string;
  providerId?: string;
  connectionId?: string;
  rateKey?: string;
  netPrice?: number;
  /** Provider slug for snapshot pricing in the comparator. */
  provider?: "hotelbeds" | "booking" | "expedia";
  currency?: string;
  /** ISO timestamp when this price was captured at quote build time. */
  fetchedAt?: string;
};

export type QuoteItemExperienceDetails = {
  activityCode?: string;
  providerId?: string;
  connectionId?: string;
  imageUrl?: string;
};

export type QuoteItemTransferDetails = {
  transferCode?: string;
  providerId?: string;
  connectionId?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
};

export interface QuoteItem {
  id: string;
  type: QuoteItemType;
  title: string;
  provider: string;
  price: number;
  markup: number;
  finalPrice: number;
  source: QuoteItemSource;
  /** Optional detail (e.g. inventory experience notes). */
  description?: string;
  /** Rich flight display data from API search results. */
  flightDetails?: QuoteItemFlightDetails;
  /** Provider identifiers for hotel price comparator. */
  hotelDetails?: QuoteItemHotelDetails;
  /** Provider identifiers for activity search and booking. */
  experienceDetails?: QuoteItemExperienceDetails;
  /** Provider identifiers and route for transfer booking. */
  transferDetails?: QuoteItemTransferDetails;
  /** When true, shown as a selectable option but excluded from quote totals. */
  alternative?: boolean;
  /** Per-line margin %; drives markup and finalPrice when edited in the UI. */
  marginPercent?: number;
  /** Optional hero image for hotel cards (e.g. destination-based Unsplash). */
  imageUrl?: string;
}

export type QuoteSelectionGroup =
  | "flight-outbound"
  | "flight-return"
  | "hotel"
  | "transfer";

export type QuoteSelectionMode = "exclusive" | "independent";

export type QuoteSelectionGroupInfo = {
  group: QuoteSelectionGroup;
  selectionMode: QuoteSelectionMode;
};

export interface QuoteSummary {
  route: string;
  durationDays: number;
  passengers: {
    adults: number;
    children: number;
    total: number;
  };
}

export interface QuotePricing {
  baseTotal: number;
  margin: number;
  finalTotal: number;
  currency: "EUR";
}

export type QuoteDataSource = "real" | "mock";

export interface QuoteSectionBuildResult {
  items: QuoteItem[];
  source: QuoteDataSource;
  mockReason?: string;
}

export interface QuoteMeta {
  flightsSource: QuoteDataSource;
  hotelsSource: QuoteDataSource;
  experiencesSource: QuoteDataSource;
  transfersSource: QuoteDataSource;
  flightsMockReason?: string;
  hotelsMockReason?: string;
  experiencesMockReason?: string;
  transfersMockReason?: string;
}

export interface Quote {
  id: string;
  summary: QuoteSummary;
  flights: QuoteItem[];
  transfers: QuoteItem[];
  hotels: QuoteItem[];
  experiences: QuoteItem[];
  pricing: QuotePricing;
  _meta: QuoteMeta;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export async function buildQuote(
  input: ParsedTripInput,
  apiOrigin = "",
  cookieHeader?: string,
): Promise<Quote> {
  console.log("[buildQuote] ParsedTripInput received", input);

  const origin = normalizePlace(input.origin);
  const destination = normalizePlace(input.destination);
  const durationDays = computeDurationDays(input.dates.start, input.dates.end);
  const nights = Math.max(1, durationDays - 1);
  const pax = normalizePassengers(input.passengers);
  const seed = hashKey(
    `${origin}|${destination}|${input.dates.start}|${input.dates.end}|${pax.adults}|${pax.children}|${input.preferences.hotelLevel}|${input.preferences.directFlights}|${input.preferences.accessibility}`,
  );

  const includeHotels = input.includeHotels ?? true;
  const includeExperiences = input.includeExperiences ?? true;
  const includeFlights = input.includeFlights ?? true;
  const includeTransfers =
    includeFlights &&
    shouldIncludeTransfers({
      origin,
      destination,
      enrichedTrip: input.enrichedTrip,
      airportChoices: input.airportChoices,
    });
  const transferLocations = includeTransfers
    ? resolveTransferLocationLabels({
        destination,
        enrichedTrip: input.enrichedTrip,
        airportChoices: input.airportChoices,
      })
    : null;

  const emptySection = (): QuoteSectionBuildResult => ({
    items: [],
    source: "real",
  });

  const inventorySearch =
    includeHotels || includeExperiences || includeTransfers
      ? fetchInventoryForQuote(
          {
            destination,
            accessibility: input.preferences.accessibility,
            hotelLevel: input.preferences.hotelLevel,
            durationDays,
          },
          apiOrigin,
          cookieHeader,
        )
      : Promise.resolve(null);

  const [flightsResult, transfersResult, hotelsResult, experiencesResult] =
    await Promise.all([
    includeFlights
      ? buildFlightsFromApiOrMock({
          origin,
          destination,
          dates: input.dates,
          pax,
          directFlights: input.preferences.directFlights,
          seed,
          enrichedTrip: input.enrichedTrip,
          airportChoices: input.airportChoices,
          locale: input.locale ?? "es",
          apiOrigin,
          cookieHeader,
        })
      : Promise.resolve(emptySection()),
    includeTransfers && transferLocations
      ? inventorySearch.then((inventory) =>
          buildTransfersFromInventoryOrApiOrMock({
            destination,
            dates: input.dates,
            pax,
            seed,
            inventory,
            pickupLocation: transferLocations.pickupLocation,
            dropoffLocation: transferLocations.dropoffLocation,
            apiOrigin,
            cookieHeader,
          }),
        )
      : Promise.resolve(emptySection()),
    includeHotels
      ? inventorySearch.then((inventory) =>
          buildHotelsFromInventoryOrApiOrMock({
            destination,
            dates: input.dates,
            nights,
            pax,
            hotelLevel: input.preferences.hotelLevel,
            accessibility: input.preferences.accessibility,
            seed,
            inventory,
            apiOrigin,
            cookieHeader,
            hotelbedsGroupDistribution: input.hotelbedsGroupDistribution,
          }),
        )
      : Promise.resolve(emptySection()),
    includeExperiences
      ? inventorySearch.then((inventory) =>
          buildExperiencesFromInventoryOrApiOrMock({
            destination,
            dates: input.dates,
            durationDays,
            pax,
            seed,
            accessibility: input.preferences.accessibility,
            hotelLevel: input.preferences.hotelLevel,
            inventory,
            apiOrigin,
            cookieHeader,
          }),
        )
      : Promise.resolve(emptySection()),
    ]);

  const flights = flightsResult.items;
  const transfers = transfersResult.items;
  const hotels = hotelsResult.items;
  const experiences = experiencesResult.items;

  const selectableItems = [...flights, ...transfers, ...hotels, ...experiences];
  const pricedItems = [
    ...itemsForPricing(flights),
    ...itemsForPricing(transfers),
    ...itemsForPricing(hotels),
    ...itemsForPricing(experiences),
  ];
  const baseTotal = sumPrices(pricedItems);

  if (input.agencyMargins) {
    for (const item of selectableItems) {
      const category = marginCategoryForItemType(item.type);
      applyItemMargin(
        item,
        category
          ? getMarginPercent(baseTotal, input.agencyMargins, category)
          : getMarginPercent(baseTotal),
      );
    }
  } else {
    const marginPercent = getMarginPercent(baseTotal);
    applyMargin(selectableItems, marginPercent);
  }

  const margin = sumMarkups(pricedItems);
  const finalTotal = baseTotal + margin;

  const flightsSource = quoteSectionSource(flights);
  const transfersSource = quoteSectionSource(transfers);
  const hotelsSource = quoteSectionSource(hotels);
  const experiencesSource = quoteSectionSource(experiences);

  return {
    id: buildQuoteId(input, origin, destination),
    summary: {
      route: `${origin} → ${destination}`,
      durationDays,
      passengers: {
        adults: pax.adults,
        children: pax.children,
        total: pax.adults + pax.children,
      },
    },
    flights,
    transfers,
    hotels,
    experiences,
    pricing: {
      baseTotal,
      margin,
      finalTotal,
      currency: "EUR",
    },
    _meta: {
      flightsSource,
      transfersSource,
      hotelsSource,
      experiencesSource,
      ...(flightsSource === "mock" && flightsResult.mockReason
        ? { flightsMockReason: flightsResult.mockReason }
        : {}),
      ...(transfersSource === "mock" && transfersResult.mockReason
        ? { transfersMockReason: transfersResult.mockReason }
        : {}),
      ...(hotelsSource === "mock" && hotelsResult.mockReason
        ? { hotelsMockReason: hotelsResult.mockReason }
        : {}),
      ...(experiencesSource === "mock" && experiencesResult.mockReason
        ? { experiencesMockReason: experiencesResult.mockReason }
        : {}),
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Search APIs
// ─────────────────────────────────────────────────────────────

function buildServerFetchHeaders(
  apiOrigin: string,
  cookieHeader?: string,
): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiOrigin && cookieHeader) {
    headers.Cookie = cookieHeader;
  }
  return headers;
}

async function postSearchApi<T>(
  path: string,
  body: Record<string, unknown>,
  apiOrigin = "",
  cookieHeader?: string,
): Promise<T | null> {
  try {
    const url = apiOrigin ? `${apiOrigin.replace(/\/$/, "")}${path}` : path;
    const response = await fetch(url, {
      method: "POST",
      headers: buildServerFetchHeaders(apiOrigin, cookieHeader),
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      return null;
    }
    return data as T;
  } catch (error) {
    console.warn(`[buildQuote] ${path} failed`, error);
    return null;
  }
}

async function searchFlightsApi(
  params: {
    origin: string;
    destination: string;
    date: string;
    adults: number;
    locale?: DuffelLocale;
  },
  apiOrigin = "",
  cookieHeader?: string,
): Promise<FlightOption[]> {
  const data = await postSearchApi<{ flights?: FlightOption[]; fallback?: boolean }>(
    "/api/search-flights-duffel",
    {
      origin: params.origin,
      destination: params.destination,
      date: params.date,
      adults: params.adults,
      locale: params.locale ?? "es",
    },
    apiOrigin,
    cookieHeader,
  );
  console.log("[buildQuote] /api/search-flights returned", {
    request: params,
    response: data,
  });
  if (!data || data.fallback) return [];
  const flights = data.flights;
  return Array.isArray(flights) && flights.length > 0 ? flights : [];
}

async function searchHotelsApi(
  params: {
    destination: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children?: number;
    hotelLevel?: HotelLevel;
    agencyId?: string;
  },
  apiOrigin = "",
  cookieHeader?: string,
): Promise<HotelOption[]> {
  const data = await postSearchApi<{ hotels?: HotelOption[]; fallback?: boolean }>(
    "/api/search-hotels",
    {
      destination: params.destination,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      adults: params.adults,
      children: params.children,
      hotelLevel: params.hotelLevel,
      agencyId: params.agencyId,
    },
    apiOrigin,
    cookieHeader,
  );
  console.log("[buildQuote] /api/search-hotels returned", {
    request: params,
    response: data,
  });
  if (!data || data.fallback) return [];
  const hotels = data.hotels;
  return Array.isArray(hotels) && hotels.length > 0 ? hotels : [];
}

async function searchTransfersHotelbedsApi(
  params: {
    destination: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children?: number;
    pickupLocation?: string;
    dropoffLocation?: string;
    agencyId?: string;
  },
  apiOrigin = "",
  cookieHeader?: string,
): Promise<TransferOption[]> {
  try {
    const path = "/api/search-transfers-hotelbeds";
    const url = apiOrigin ? `${apiOrigin.replace(/\/$/, "")}${path}` : path;
    const response = await fetch(url, {
      method: "POST",
      headers: buildServerFetchHeaders(apiOrigin, cookieHeader),
      body: JSON.stringify({
        destination: params.destination,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        adults: params.adults,
        children: params.children,
        pickupLocation: params.pickupLocation,
        dropoffLocation: params.dropoffLocation,
        agencyId: params.agencyId,
      }),
    });
    const data = (await response.json()) as {
      transfers?: TransferOption[];
      fallback?: boolean;
    };
    const transfers = Array.isArray(data?.transfers) ? data.transfers : [];
    console.log("[buildQuote] /api/search-transfers-hotelbeds", {
      status: response.status,
      fallback: data?.fallback === true,
      transferCount: transfers.length,
    });
    if (!response.ok || !data || data.fallback) return [];
    return transfers.length > 0 ? transfers : [];
  } catch (error) {
    console.warn("[buildQuote] /api/search-transfers-hotelbeds failed", error);
    return [];
  }
}

async function searchExperiencesHotelbedsApi(
  params: {
    destination: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children?: number;
    agencyId?: string;
  },
  apiOrigin = "",
  cookieHeader?: string,
): Promise<ExperienceOption[]> {
  try {
    const path = "/api/search-experiences-hotelbeds";
    const url = apiOrigin ? `${apiOrigin.replace(/\/$/, "")}${path}` : path;
    const response = await fetch(url, {
      method: "POST",
      headers: buildServerFetchHeaders(apiOrigin, cookieHeader),
      body: JSON.stringify({
        destination: params.destination,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        adults: params.adults,
        children: params.children,
        agencyId: params.agencyId,
      }),
    });
    const data = (await response.json()) as {
      experiences?: ExperienceOption[];
      fallback?: boolean;
    };
    const experiences = Array.isArray(data?.experiences) ? data.experiences : [];
    console.log("[buildQuote] /api/search-experiences-hotelbeds", {
      status: response.status,
      fallback: data?.fallback === true,
      experienceCount: experiences.length,
    });
    if (!response.ok || !data || data.fallback) return [];
    return experiences.length > 0 ? experiences : [];
  } catch (error) {
    console.warn("[buildQuote] /api/search-experiences-hotelbeds failed", error);
    return [];
  }
}

async function searchHotelsHotelbedsApi(
  params: {
    destination: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children?: number;
    hotelLevel?: HotelLevel;
    agencyId?: string;
    hotelbedsGroupDistribution?: {
      doubles: number;
      singles: number;
      triples: number;
    };
  },
  apiOrigin = "",
  cookieHeader?: string,
): Promise<HotelOption[]> {
  try {
    const path = "/api/search-hotels-hotelbeds";
    const url = apiOrigin ? `${apiOrigin.replace(/\/$/, "")}${path}` : path;
    const response = await fetch(url, {
      method: "POST",
      headers: buildServerFetchHeaders(apiOrigin, cookieHeader),
      body: JSON.stringify({
        destination: params.destination,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        adults: params.adults,
        children: params.children,
        hotelLevel: params.hotelLevel,
        groupDistribution: params.hotelbedsGroupDistribution,
        agencyId: params.agencyId,
      }),
    });
    const data = (await response.json()) as {
      hotels?: HotelOption[];
      fallback?: boolean;
    };
    const hotels = Array.isArray(data?.hotels) ? data.hotels : [];
    console.log("[buildQuote] /api/search-hotels-hotelbeds", {
      status: response.status,
      fallback: data?.fallback === true,
      hotelCount: hotels.length,
    });
    if (!response.ok || !data || data.fallback) return [];
    return hotels.length > 0 ? hotels : [];
  } catch (error) {
    console.warn("[buildQuote] /api/search-hotels-hotelbeds failed", error);
    return [];
  }
}

function flightDetailsFromOption(flight: FlightOption): QuoteItemFlightDetails {
  return {
    departureDate: flight.departureDate,
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    duration: flight.duration,
    originIata: flight.originIata,
    destinationIata: flight.destinationIata,
    originCity: flight.originCity,
    destinationCity: flight.destinationCity,
    airline: flight.airline,
    airlineLogoUrl: flight.airlineLogoUrl,
    flightNumber: flight.flightNumber,
    cabinClass: flight.cabinClass,
    baggageIncluded: flight.baggageIncluded,
    layovers: flight.layovers,
    stops: Number(flight.stops) || 0,
    priceNumeric: flight.priceNumeric,
    ...(flight.fareName ? { fareName: flight.fareName } : {}),
    ...(flight.offerId
      ? {
          selectedOfferId: flight.offerId,
          primaryOfferId: flight.offerId,
        }
      : {}),
    primaryPriceNumeric: flight.priceNumeric,
    primaryCabinClass: flight.cabinClass,
    primaryBaggageIncluded: flight.baggageIncluded,
    ...(flight.fareName ? { primaryFareName: flight.fareName } : {}),
    ...(flight.fareOptions?.length ? { fareOptions: flight.fareOptions } : {}),
  };
}

function mapApiFlightToQuoteItem(
  flight: FlightOption,
  id: string,
  routeLabel: string,
  alternative = false,
): QuoteItem | null {
  const isDirect = String(flight.stops) === "0";
  const stopLabel = isDirect ? "directo" : `${flight.stops} escala(s)`;
  const price =
    flight.priceNumeric > 0 ? flight.priceNumeric : parsePriceString(flight.price);

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  return draftItem({
    id,
    type: "flight",
    title: `${flight.airline} ${flight.flightNumber} · ${stopLabel} · ${routeLabel}`,
    provider: flight.airline,
    price,
    source: "api",
    flightDetails: flightDetailsFromOption(flight),
    alternative,
  });
}

function resolveHotelProvider(
  providerId?: string,
  providerLabel?: string,
): QuoteItemHotelDetails["provider"] | undefined {
  const slug = providerSlug(providerId ?? providerLabel ?? "");
  if (slug === "hotelbeds" || slug === "booking" || slug === "expedia") {
    return slug;
  }
  const label = (providerLabel ?? "").toLowerCase();
  if (label.includes("hotelbeds")) return "hotelbeds";
  if (label.includes("booking")) return "booking";
  if (label.includes("expedia")) return "expedia";
  return undefined;
}

function buildHotelDetails(
  hotel: HotelOption,
  providerId?: string,
  providerLabel?: string,
): QuoteItemHotelDetails | undefined {
  const hotelCode = hotel.hotelCode ?? hotel.propertyId;
  const connectionId = hotel.connectionId;
  if (!hotelCode && !providerId && !connectionId) {
    return undefined;
  }
  const provider = resolveHotelProvider(providerId, providerLabel);
  return {
    ...(hotelCode ? { hotelCode } : {}),
    ...(providerId ? { providerId } : {}),
    ...(connectionId ? { connectionId } : {}),
    ...(hotel.rateKey ? { rateKey: hotel.rateKey } : {}),
    ...(Number.isFinite(hotel.netPrice) ? { netPrice: hotel.netPrice } : {}),
    ...(provider ? { provider } : {}),
    currency: "EUR",
    fetchedAt: new Date().toISOString(),
  };
}

function mapApiHotelToQuoteItem(
  hotel: HotelOption,
  nights: number,
  id: string,
  alternative = false,
  providerLabel = "Booking.com",
  providerId?: string,
): QuoteItem | null {
  const pricePerNight = parsePriceString(hotel.pricePerNight);
  const totalPrice = Math.round(pricePerNight * nights);

  if (
    !Number.isFinite(pricePerNight) ||
    pricePerNight <= 0 ||
    !Number.isFinite(totalPrice) ||
    totalPrice <= 0
  ) {
    return null;
  }

  const hotelDetails = buildHotelDetails(hotel, providerId, providerLabel);

  return draftItem({
    id,
    type: "hotel",
    title: `${hotel.name} — ${nights} ${nights === 1 ? "noche" : "noches"} · ${hotel.roomType}`,
    provider: providerLabel,
    price: totalPrice,
    source: "api",
    alternative,
    ...(hotelDetails ? { hotelDetails } : {}),
    ...(hotel.imageUrl ? { imageUrl: hotel.imageUrl } : {}),
  });
}

export function itemsForPricing(items: QuoteItem[]) {
  return items.filter((item) => !item.alternative);
}

export function getQuoteSelectionGroup(
  itemId: string,
): QuoteSelectionGroupInfo | null {
  if (itemId.startsWith("flight-out")) {
    return { group: "flight-outbound", selectionMode: "exclusive" };
  }

  if (itemId.startsWith("flight-return")) {
    return { group: "flight-return", selectionMode: "exclusive" };
  }

  if (itemId.startsWith("hotel-")) {
    return { group: "hotel", selectionMode: "exclusive" };
  }

  if (itemId.startsWith("transfer-")) {
    return { group: "transfer", selectionMode: "independent" };
  }

  return null;
}

export function getItemMarginPercent(item: QuoteItem): number {
  if (item.marginPercent !== undefined && Number.isFinite(item.marginPercent)) {
    return item.marginPercent;
  }

  if (item.price > 0) {
    return Math.round((item.markup / item.price) * 1000) / 10;
  }

  return 0;
}

export function applyItemMargin(item: QuoteItem, marginPercent: number): void {
  const percent = Math.max(0, Number.isFinite(marginPercent) ? marginPercent : 0);
  item.marginPercent = percent;
  item.markup = roundEur(item.price * (percent / 100));
  item.finalPrice = item.price + item.markup;
}

export function selectPrimaryInGroup(quote: Quote, selectedId: string): void {
  const selection = getQuoteSelectionGroup(selectedId);
  if (!selection || selection.selectionMode === "independent") {
    return;
  }

  const { group } = selection;

  const applyToList = (items: QuoteItem[]) => {
    for (const item of items) {
      if (getQuoteSelectionGroup(item.id)?.group !== group) {
        continue;
      }

      item.alternative = item.id !== selectedId;
    }
  };

  applyToList(quote.flights);
  applyToList(quote.hotels);
}

export function toggleExperienceInQuote(quote: Quote, itemId: string): void {
  const item = quote.experiences.find((entry) => entry.id === itemId);
  if (!item) return;
  item.alternative = !item.alternative;
}

export function toggleTransferInQuote(quote: Quote, itemId: string): void {
  const item = quote.transfers.find((entry) => entry.id === itemId);
  if (!item) return;
  item.alternative = !item.alternative;
}

export function pricedQuoteItemsFromQuote(quote: Quote): QuoteItem[] {
  return [
    ...itemsForPricing(quote.flights),
    ...itemsForPricing(quote.transfers),
    ...itemsForPricing(quote.hotels),
    ...itemsForPricing(quote.experiences),
  ];
}

export function syncQuotePricing(quote: Quote): void {
  const pricedItems = pricedQuoteItemsFromQuote(quote);
  quote.pricing.baseTotal = sumPrices(pricedItems);
  quote.pricing.margin = sumMarkups(pricedItems);
  quote.pricing.finalTotal = quote.pricing.baseTotal + quote.pricing.margin;
}

function quoteSectionSource(items: QuoteItem[]): QuoteDataSource {
  if (items.length === 0) return "mock";
  return items.every((item) => item.source === "mock") ? "mock" : "real";
}

type InventoryQuoteSearchResponse = {
  hotels: InventoryQuoteRow[];
  experiences: InventoryQuoteRow[];
  transfers?: InventoryQuoteRow[];
};

async function fetchInventoryForQuote(
  params: {
    destination: string;
    accessibility: boolean;
    hotelLevel: HotelLevel;
    durationDays: number;
  },
  apiOrigin = "",
  cookieHeader?: string,
): Promise<InventoryQuoteSearchResponse | null> {
  try {
    const path = "/api/inventory/quote-search";
    const url = apiOrigin ? `${apiOrigin.replace(/\/$/, "")}${path}` : path;
    const response = await fetch(url, {
      method: "POST",
      headers: buildServerFetchHeaders(apiOrigin, cookieHeader),
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      console.warn("[buildQuote] inventory quote-search failed", response.status);
      return null;
    }
    const data = (await response.json()) as InventoryQuoteSearchResponse;
    return {
      hotels: data.hotels ?? [],
      experiences: data.experiences ?? [],
      transfers: data.transfers ?? [],
    };
  } catch (error) {
    console.warn("[buildQuote] inventory quote-search error", error);
    return null;
  }
}

function mapInventoryHotelToQuoteItem(
  row: InventoryQuoteRow,
  nights: number,
  id: string,
  alternative = false,
): QuoteItem {
  const netPerNight = resolveInventoryNetPrice(row.data);
  const stars = row.data.stars ? `${row.data.stars}★` : "";
  const city = row.data.city || row.data.destination || "";
  const locationBit = [stars, city].filter(Boolean).join(" · ");
  const nightLabel = nights === 1 ? "noche" : "noches";

  return draftItem({
    id,
    type: "hotel",
    title: locationBit
      ? `${row.name} — ${nights} ${nightLabel} · ${locationBit}`
      : `${row.name} — ${nights} ${nightLabel}`,
    provider: resolveInventoryProvider(row.data),
    price: Math.max(netPerNight * nights, netPerNight),
    source: "inventory",
    alternative,
  });
}

function buildExperienceDetails(
  experience: ExperienceOption,
  providerId?: string,
): QuoteItemExperienceDetails | undefined {
  const activityCode = experience.activityCode;
  const connectionId = experience.connectionId;
  if (!activityCode && !providerId && !connectionId && !experience.imageUrl) {
    return undefined;
  }
  return {
    ...(activityCode ? { activityCode } : {}),
    ...(providerId ? { providerId } : {}),
    ...(connectionId ? { connectionId } : {}),
    ...(experience.imageUrl ? { imageUrl: experience.imageUrl } : {}),
  };
}

function buildTransferDetails(
  transfer: TransferOption,
  providerId?: string,
  fallbackPickup?: string,
  fallbackDropoff?: string,
): QuoteItemTransferDetails | undefined {
  const pickupLocation = transfer.pickupLocation ?? fallbackPickup;
  const dropoffLocation = transfer.dropoffLocation ?? fallbackDropoff;
  const transferCode = transfer.transferCode;
  const connectionId = transfer.connectionId;
  if (
    !transferCode &&
    !providerId &&
    !connectionId &&
    !pickupLocation &&
    !dropoffLocation
  ) {
    return undefined;
  }
  return {
    ...(transferCode ? { transferCode } : {}),
    ...(providerId ? { providerId } : {}),
    ...(connectionId ? { connectionId } : {}),
    ...(pickupLocation ? { pickupLocation } : {}),
    ...(dropoffLocation ? { dropoffLocation } : {}),
  };
}

function mapApiTransferToQuoteItem(
  transfer: TransferOption,
  id: string,
  alternative = false,
  providerLabel = "Hotelbeds",
  providerId?: string,
  fallbackPickup?: string,
  fallbackDropoff?: string,
): QuoteItem | null {
  const price = transfer.price;
  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  const transferDetails = buildTransferDetails(
    transfer,
    providerId,
    fallbackPickup,
    fallbackDropoff,
  );

  return draftItem({
    id,
    type: "transfer",
    title: transfer.name,
    provider: transfer.providerName ?? providerLabel,
    price,
    source: "api",
    alternative,
    ...(transferDetails ? { transferDetails } : {}),
  });
}

function mapInventoryTransferToQuoteItem(
  row: InventoryQuoteRow,
  pax: { adults: number; children: number },
  id: string,
  alternative = false,
  pickupLocation?: string,
  dropoffLocation?: string,
): QuoteItem {
  const totalPax = pax.adults + pax.children;
  const unitPrice = resolveInventoryNetPrice(row.data);
  const price =
    unitPrice > 0
      ? Math.round(unitPrice * Math.max(1, totalPax))
      : Math.round(40 * totalPax);
  const notes = row.data.notes?.trim();
  const invPickup = row.data.pickup?.trim() || pickupLocation;
  const invDropoff = row.data.dropoff?.trim() || dropoffLocation;

  return draftItem({
    id,
    type: "transfer",
    title: row.name,
    provider: resolveInventoryProvider(row.data),
    price,
    source: "inventory",
    description: notes || undefined,
    alternative,
    ...(invPickup || invDropoff
      ? {
          transferDetails: {
            ...(invPickup ? { pickupLocation: invPickup } : {}),
            ...(invDropoff ? { dropoffLocation: invDropoff } : {}),
            providerId: "inventory",
          },
        }
      : {}),
  });
}

function mapApiExperienceToQuoteItem(
  experience: ExperienceOption,
  id: string,
  alternative = false,
  providerLabel = "Hotelbeds",
  providerId?: string,
): QuoteItem | null {
  const price = experience.price;
  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  const experienceDetails = buildExperienceDetails(experience, providerId);

  return draftItem({
    id,
    type: "experience",
    title: experience.name,
    provider: experience.providerName ?? providerLabel,
    price,
    source: "api",
    alternative,
    ...(experienceDetails ? { experienceDetails } : {}),
    ...(experience.imageUrl ? { imageUrl: experience.imageUrl } : {}),
  });
}

function mapInventoryExperienceToQuoteItem(
  row: InventoryQuoteRow,
  pax: { adults: number; children: number },
  id: string,
  alternative = false,
): QuoteItem {
  const totalPax = pax.adults + pax.children;
  const unitPrice = resolveInventoryNetPrice(row.data);
  const price =
    unitPrice > 0
      ? Math.round(unitPrice * Math.max(1, totalPax))
      : Math.round(45 * totalPax);
  const notes = row.data.notes?.trim();

  return draftItem({
    id,
    type: "experience",
    title: row.name,
    provider: resolveInventoryProvider(row.data),
    price,
    source: "inventory",
    description: notes || undefined,
    alternative,
  });
}

function defaultAirportChoicesFromEnriched(
  trip: EnrichedTripRequest,
): AirportFlightChoices {
  const origin = trip._resolved.origin;
  const destination = trip._resolved.destination;
  return {
    origin: origin?.selectedIata ?? origin?.airports[0]?.iata ?? "all",
    destination:
      destination?.selectedIata ?? destination?.airports[0]?.iata ?? "all",
  };
}

function resolveFlightIataCodes(params: {
  origin: string;
  destination: string;
  enrichedTrip?: EnrichedTripRequest;
  airportChoices?: AirportFlightChoices;
}): { originIata: string; destinationIata: string } {
  if (params.enrichedTrip) {
    const choices =
      params.airportChoices ??
      defaultAirportChoicesFromEnriched(params.enrichedTrip);
    const flightParams = buildFlightSearchParams(params.enrichedTrip, choices);
    if (!("error" in flightParams)) {
      if (flightParams.origins.length > 1) {
        // TODO: run parallel flight searches for each origin IATA
      }
      if (flightParams.destinations.length > 1) {
        // TODO: run parallel flight searches for each destination IATA
      }
      return {
        originIata: flightParams.origins[0],
        destinationIata: flightParams.destinations[0],
      };
    }
    console.warn(
      "[buildQuote] buildFlightSearchParams failed, falling back to getCityIATA",
      flightParams.error,
    );
  }

  return {
    originIata: getCityIATA(params.origin),
    destinationIata: getCityIATA(params.destination),
  };
}

function shouldSkipFlightSearch(origin: string, destination: string): boolean {
  const normalizedOrigin = normalizePlace(origin);
  const normalizedDestination = normalizePlace(destination);
  if (normalizedOrigin === normalizedDestination) return true;

  const originIata = getCityIATA(origin);
  const destinationIata = getCityIATA(destination);
  return originIata === destinationIata;
}

async function buildFlightsFromApiOrMock(params: {
  origin: string;
  destination: string;
  dates: { start: string; end: string };
  pax: { adults: number; children: number };
  directFlights: boolean;
  seed: number;
  enrichedTrip?: EnrichedTripRequest;
  airportChoices?: AirportFlightChoices;
  locale?: DuffelLocale;
  apiOrigin?: string;
  cookieHeader?: string;
}): Promise<QuoteSectionBuildResult> {
  const {
    origin,
    destination,
    dates,
    pax,
    directFlights,
    seed,
    locale = "es",
    apiOrigin = "",
    cookieHeader,
  } = params;
  const adults = pax.adults;

  if (shouldSkipFlightSearch(origin, destination)) {
    console.log("[buildQuote] skipping flights — same origin and destination", {
      origin,
      destination,
    });
    return { items: [], source: "real" };
  }

  const { originIata, destinationIata } = resolveFlightIataCodes({
    origin,
    destination,
    enrichedTrip: params.enrichedTrip,
    airportChoices: params.airportChoices,
  });
  console.log("[buildQuote] resolved IATA codes", {
    origin: { city: origin, iata: originIata },
    destination: { city: destination, iata: destinationIata },
    airportChoices: params.airportChoices,
  });

  const [outboundFlights, returnFlights] = await Promise.all([
    searchFlightsApi(
      {
        origin: originIata,
        destination: destinationIata,
        date: dates.start,
        adults,
        locale,
      },
      apiOrigin,
      cookieHeader,
    ),
    searchFlightsApi(
      {
        origin: destinationIata,
        destination: originIata,
        date: dates.end,
        adults,
        locale,
      },
      apiOrigin,
      cookieHeader,
    ),
  ]);

  console.log("[buildQuote] flights before mapping to QuoteItem", {
    outbound: outboundFlights,
    return: returnFlights,
  });

  const items: QuoteItem[] = [];

  for (const [index, flight] of outboundFlights.slice(0, 10).entries()) {
    const item = mapApiFlightToQuoteItem(
      flight,
      `flight-out-${index + 1}`,
      `${origin} → ${destination}`,
      index > 0,
    );
    if (item) items.push(item);
  }

  for (const [index, flight] of returnFlights.slice(0, 10).entries()) {
    const item = mapApiFlightToQuoteItem(
      flight,
      `flight-return-${index + 1}`,
      `${destination} → ${origin}`,
      index > 0,
    );
    if (item) items.push(item);
  }

  if (items.length > 0) {
    return { items, source: "real" };
  }

  return {
    items: buildMockFlights({ origin, destination, pax, directFlights, seed }),
    source: "mock",
    mockReason: "Flight search API returned no results",
  };
}

const HOTEL_QUOTE_LIMIT = 10;
const HOTEL_INVENTORY_LIMIT = 3;
const HOTEL_HOTELBEDS_LIMIT = 8;
const EXPERIENCE_QUOTE_LIMIT = 5;
const EXPERIENCE_INVENTORY_LIMIT = 3;
const EXPERIENCE_HOTELBEDS_LIMIT = 5;
const TRANSFER_QUOTE_LIMIT = 3;
const TRANSFER_HOTELBEDS_LIMIT = 3;

function appendHotelbedsToQuoteItems(
  items: QuoteItem[],
  hotelbedsHotels: HotelOption[],
  nights: number,
): void {
  for (const hotel of hotelbedsHotels) {
    if (items.length >= HOTEL_HOTELBEDS_LIMIT) break;
    const item = mapApiHotelToQuoteItem(
      hotel,
      nights,
      `hotel-api-${items.length + 1}`,
      items.length > 0,
      hotel.providerName ?? "Hotelbeds",
      "hotelbeds",
    );
    if (item) items.push(item);
  }
}

function appendBookingToQuoteItems(
  items: QuoteItem[],
  bookingHotels: HotelOption[],
  nights: number,
): void {
  for (const hotel of bookingHotels) {
    if (items.length >= HOTEL_QUOTE_LIMIT) break;
    const item = mapApiHotelToQuoteItem(
      hotel,
      nights,
      `hotel-api-${items.length + 1}`,
      items.length > 0,
      "Booking.com",
      "booking",
    );
    if (item) items.push(item);
  }
}

async function fillApiHotelsSequentially(
  items: QuoteItem[],
  hotelSearchParams: {
    destination: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children?: number;
    hotelLevel?: HotelLevel;
    agencyId?: string;
    hotelbedsGroupDistribution?: {
      doubles: number;
      singles: number;
      triples: number;
    };
  },
  nights: number,
  apiOrigin: string,
  cookieHeader?: string,
): Promise<void> {
  if (items.length >= HOTEL_QUOTE_LIMIT) return;

  if (items.length < HOTEL_HOTELBEDS_LIMIT) {
    const hotelbedsHotels = await searchHotelsHotelbedsApi(
      hotelSearchParams,
      apiOrigin,
      cookieHeader,
    );
    console.log("[buildQuote] Hotelbeds hotels", hotelbedsHotels);
    appendHotelbedsToQuoteItems(items, hotelbedsHotels, nights);
  }

  // Para viajes de grupo, Hotelbeds es el proveedor que soporta multi-ocupación.
  // Evitamos mezclar con Booking para no mostrar precios incoherentes.
  if (!hotelSearchParams.hotelbedsGroupDistribution && items.length < HOTEL_QUOTE_LIMIT) {
    const bookingHotels = await searchHotelsApi(
      hotelSearchParams,
      apiOrigin,
      cookieHeader,
    );
    console.log("[buildQuote] Booking hotels", bookingHotels);
    appendBookingToQuoteItems(items, bookingHotels, nights);
  }
}

async function buildHotelsFromInventoryOrApiOrMock(params: {
  destination: string;
  dates: { start: string; end: string };
  nights: number;
  pax: { adults: number; children: number };
  hotelLevel: HotelLevel;
  accessibility: boolean;
  seed: number;
  inventory: InventoryQuoteSearchResponse | null;
  apiOrigin?: string;
  cookieHeader?: string;
  alwaysIncludeApi?: boolean;
  hotelbedsGroupDistribution?: ParsedTripInput["hotelbedsGroupDistribution"];
}): Promise<QuoteSectionBuildResult> {
  const {
    destination,
    dates,
    nights,
    pax,
    hotelLevel,
    accessibility,
    seed,
    inventory,
    apiOrigin = "",
    cookieHeader,
    alwaysIncludeApi = false,
  } = params;

  const inventoryRows = inventory?.hotels ?? [];
  const items: QuoteItem[] = [];
  const hotelSearchParams = {
    destination,
    checkIn: dates.start,
    checkOut: dates.end,
    adults: pax.adults,
    children: pax.children,
    hotelLevel,
    hotelbedsGroupDistribution: params.hotelbedsGroupDistribution,
  };

  if (alwaysIncludeApi) {
    console.log("[buildQuote] hotels API refresh (level change)");
    await fillApiHotelsSequentially(
      items,
      hotelSearchParams,
      nights,
      apiOrigin,
      cookieHeader,
    );
  }

  if (!alwaysIncludeApi && inventoryRows.length > 0) {
    console.log("[buildQuote] INV-PROPIO hotels", {
      count: inventoryRows.length,
      destination,
      rows: inventoryRows.map((row) => ({
        id: row.id,
        category: row.category,
        name: row.name,
      })),
    });

    for (const row of inventoryRows.slice(0, HOTEL_INVENTORY_LIMIT)) {
      items.push(
        mapInventoryHotelToQuoteItem(
          row,
          nights,
          `hotel-inv-${row.id.slice(0, 8)}`,
          items.length > 0,
        ),
      );
    }
  }

  const inventorySlots = Math.min(
    HOTEL_INVENTORY_LIMIT,
    HOTEL_QUOTE_LIMIT - items.length,
  );
  if (alwaysIncludeApi && inventorySlots > 0 && inventoryRows.length > 0) {
    console.log("[buildQuote] INV-PROPIO hotels (after API refresh)", {
      count: inventoryRows.length,
      destination,
    });

    for (const row of inventoryRows.slice(0, inventorySlots)) {
      items.push(
        mapInventoryHotelToQuoteItem(
          row,
          nights,
          `hotel-inv-${row.id.slice(0, 8)}`,
          items.length > 0,
        ),
      );
    }
  }

  if (!alwaysIncludeApi && items.length < HOTEL_QUOTE_LIMIT) {
    await fillApiHotelsSequentially(
      items,
      hotelSearchParams,
      nights,
      apiOrigin,
      cookieHeader,
    );
  }

  if (items.length > 0) {
    const source = items.every((item) => item.source === "mock") ? "mock" : "real";
    return { items, source };
  }

  return {
    items: buildMockHotels({
      destination,
      nights,
      pax,
      hotelLevel,
      accessibility,
      seed,
    }).slice(0, HOTEL_QUOTE_LIMIT),
    source: "mock",
    mockReason: "No inventory or API hotel results for destination",
  };
}

function appendHotelbedsExperiencesToQuoteItems(
  items: QuoteItem[],
  experiences: ExperienceOption[],
): void {
  for (const experience of experiences) {
    if (items.length >= EXPERIENCE_HOTELBEDS_LIMIT) break;
    const item = mapApiExperienceToQuoteItem(
      experience,
      `exp-api-${items.length + 1}`,
      items.length > 0,
      experience.providerName ?? "Hotelbeds",
      "hotelbeds-activities",
    );
    if (item) items.push(item);
  }
}

async function fillApiExperiencesSequentially(
  items: QuoteItem[],
  experienceSearchParams: {
    destination: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children?: number;
    agencyId?: string;
  },
  apiOrigin: string,
  cookieHeader?: string,
): Promise<void> {
  if (items.length >= EXPERIENCE_QUOTE_LIMIT) return;

  if (items.length < EXPERIENCE_HOTELBEDS_LIMIT) {
    const hotelbedsExperiences = await searchExperiencesHotelbedsApi(
      experienceSearchParams,
      apiOrigin,
      cookieHeader,
    );
    console.log("[buildQuote] Hotelbeds experiences", hotelbedsExperiences);
    appendHotelbedsExperiencesToQuoteItems(items, hotelbedsExperiences);
  }
}

function appendHotelbedsTransfersToQuoteItems(
  items: QuoteItem[],
  transfers: TransferOption[],
  pickupLocation: string,
  dropoffLocation: string,
): void {
  for (const transfer of transfers) {
    if (items.length >= TRANSFER_HOTELBEDS_LIMIT) break;
    const item = mapApiTransferToQuoteItem(
      transfer,
      `transfer-api-${items.length + 1}`,
      false,
      transfer.providerName ?? "Hotelbeds",
      "hotelbeds-transfers",
      pickupLocation,
      dropoffLocation,
    );
    if (item) items.push(item);
  }
}

async function fillApiTransfersSequentially(
  items: QuoteItem[],
  transferSearchParams: {
    destination: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children?: number;
    pickupLocation?: string;
    dropoffLocation?: string;
    agencyId?: string;
  },
  pickupLocation: string,
  dropoffLocation: string,
  apiOrigin: string,
  cookieHeader?: string,
): Promise<void> {
  if (items.length >= TRANSFER_QUOTE_LIMIT) return;

  if (items.length < TRANSFER_HOTELBEDS_LIMIT) {
    const hotelbedsTransfers = await searchTransfersHotelbedsApi(
      transferSearchParams,
      apiOrigin,
      cookieHeader,
    );
    console.log("[buildQuote] Hotelbeds transfers", hotelbedsTransfers);
    appendHotelbedsTransfersToQuoteItems(
      items,
      hotelbedsTransfers,
      pickupLocation,
      dropoffLocation,
    );
  }
}

function buildMockTransfers(params: {
  destination: string;
  pax: { adults: number; children: number };
  seed: number;
  pickupLocation: string;
  dropoffLocation: string;
}): QuoteItem[] {
  const { destination, pax, seed, pickupLocation, dropoffLocation } = params;
  const totalPax = Math.max(1, pax.adults + pax.children);
  const base = 28 + (seed % 18);

  const candidates: QuoteItem[] = [
    draftItem({
      id: "transfer-private",
      type: "transfer",
      title: `Traslado privado · ${pickupLocation} → ${dropoffLocation}`,
      provider: pickFrom(seed + 19, ["Hotelbeds", "Operador local"]),
      price: Math.round(base * totalPax * 1.35),
      source: "mock",
      transferDetails: {
        pickupLocation,
        dropoffLocation,
        providerId: "hotelbeds-transfers",
      },
    }),
    draftItem({
      id: "transfer-shuttle",
      type: "transfer",
      title: `Shuttle compartido · ${destination}`,
      provider: pickFrom(seed + 23, ["Hotelbeds", "Proveedor local"]),
      price: Math.round(base * totalPax * 0.85),
      source: "mock",
      transferDetails: {
        pickupLocation,
        dropoffLocation,
        providerId: "hotelbeds-transfers",
      },
    }),
    draftItem({
      id: "transfer-premium",
      type: "transfer",
      title: `Traslado premium · ${pickupLocation} → ${dropoffLocation}`,
      provider: "Hotelbeds",
      price: Math.round(base * totalPax * 1.75),
      source: "mock",
      transferDetails: {
        pickupLocation,
        dropoffLocation,
        providerId: "hotelbeds-transfers",
      },
    }),
  ];

  return candidates;
}

async function buildTransfersFromInventoryOrApiOrMock(params: {
  destination: string;
  dates: { start: string; end: string };
  pax: { adults: number; children: number };
  seed: number;
  inventory: InventoryQuoteSearchResponse | null;
  pickupLocation: string;
  dropoffLocation: string;
  apiOrigin?: string;
  cookieHeader?: string;
}): Promise<QuoteSectionBuildResult> {
  const {
    destination,
    dates,
    pax,
    seed,
    inventory,
    pickupLocation,
    dropoffLocation,
    apiOrigin = "",
    cookieHeader,
  } = params;

  const inventoryRows = inventory?.transfers ?? [];
  const items: QuoteItem[] = [];
  const transferSearchParams = {
    destination,
    checkIn: dates.start,
    checkOut: dates.end,
    adults: pax.adults,
    children: pax.children,
    pickupLocation,
    dropoffLocation,
  };

  if (inventoryRows.length > 0) {
    console.log("[buildQuote] INV-PROPIO transfers", {
      count: inventoryRows.length,
      destination,
    });

    for (const row of inventoryRows.slice(0, TRANSFER_QUOTE_LIMIT)) {
      items.push(
        mapInventoryTransferToQuoteItem(
          row,
          pax,
          `transfer-inv-${row.id.slice(0, 8)}`,
          false,
          pickupLocation,
          dropoffLocation,
        ),
      );
    }
  }

  if (items.length < TRANSFER_QUOTE_LIMIT) {
    await fillApiTransfersSequentially(
      items,
      transferSearchParams,
      pickupLocation,
      dropoffLocation,
      apiOrigin,
      cookieHeader,
    );
  }

  if (items.length < TRANSFER_QUOTE_LIMIT) {
    const mockItems = buildMockTransfers({
      destination,
      pax,
      seed,
      pickupLocation,
      dropoffLocation,
    });
    const remaining = TRANSFER_QUOTE_LIMIT - items.length;

    for (const mock of mockItems.slice(0, remaining)) {
      items.push({
        ...mock,
        id: `transfer-mock-${items.length + 1}`,
        alternative: false,
      });
    }
  }

  const allMock = items.every((item) => item.source === "mock");

  return {
    items,
    source: allMock ? "mock" : "real",
    ...(allMock
      ? { mockReason: "No inventory or API transfer results for destination" }
      : {}),
  };
}

async function buildExperiencesFromInventoryOrApiOrMock(params: {
  destination: string;
  dates: { start: string; end: string };
  durationDays: number;
  pax: { adults: number; children: number };
  seed: number;
  accessibility: boolean;
  hotelLevel: HotelLevel;
  inventory: InventoryQuoteSearchResponse | null;
  apiOrigin?: string;
  cookieHeader?: string;
}): Promise<QuoteSectionBuildResult> {
  const {
    destination,
    dates,
    durationDays,
    pax,
    seed,
    inventory,
    apiOrigin = "",
    cookieHeader,
  } = params;

  const inventoryRows = inventory?.experiences ?? [];
  const items: QuoteItem[] = [];
  const experienceSearchParams = {
    destination,
    checkIn: dates.start,
    checkOut: dates.end,
    adults: pax.adults,
    children: pax.children,
  };

  if (inventoryRows.length > 0) {
    console.log("[buildQuote] INV-PROPIO experiences", {
      count: inventoryRows.length,
      destination,
      rows: inventoryRows.map((row) => ({
        id: row.id,
        category: row.category,
        name: row.name,
      })),
    });

    for (const row of inventoryRows.slice(0, EXPERIENCE_INVENTORY_LIMIT)) {
      items.push(
        mapInventoryExperienceToQuoteItem(
          row,
          pax,
          `exp-inv-${row.id.slice(0, 8)}`,
          items.length > 0,
        ),
      );
    }
  }

  if (items.length < EXPERIENCE_QUOTE_LIMIT) {
    await fillApiExperiencesSequentially(
      items,
      experienceSearchParams,
      apiOrigin,
      cookieHeader,
    );
  }

  if (items.length < EXPERIENCE_QUOTE_LIMIT) {
    const mockItems = buildExperiences({ destination, durationDays, pax, seed });
    const remaining = EXPERIENCE_QUOTE_LIMIT - items.length;

    for (const mock of mockItems.slice(0, remaining)) {
      items.push({
        ...mock,
        id: `exp-mock-${items.length + 1}`,
        alternative: items.length > 0,
      });
    }
  }

  const allMock = items.every((item) => item.source === "mock");

  return {
    items,
    source: allMock ? "mock" : "real",
    ...(allMock
      ? { mockReason: "No inventory or API experience results for destination" }
      : {}),
  };
}

export async function rebuildHotelsSection(
  input: ParsedTripInput,
  inventory: InventoryQuoteSearchResponse | null,
  apiOrigin = "",
  options?: { alwaysIncludeApi?: boolean },
): Promise<QuoteSectionBuildResult> {
  const destination = normalizePlace(input.destination);
  const durationDays = computeDurationDays(input.dates.start, input.dates.end);
  const nights = Math.max(1, durationDays - 1);
  const pax = normalizePassengers(input.passengers);
  const seed = hashKey(
    `${normalizePlace(input.origin)}|${destination}|${input.dates.start}|${input.dates.end}|${pax.adults}|${pax.children}|${input.preferences.hotelLevel}|${input.preferences.directFlights}|${input.preferences.accessibility}`,
  );

  return buildHotelsFromInventoryOrApiOrMock({
    destination,
    dates: input.dates,
    nights,
    pax,
    hotelLevel: input.preferences.hotelLevel,
    accessibility: input.preferences.accessibility,
    seed,
    inventory,
    apiOrigin,
    alwaysIncludeApi: options?.alwaysIncludeApi,
    hotelbedsGroupDistribution: input.hotelbedsGroupDistribution,
  });
}

// ─────────────────────────────────────────────────────────────
// Mock line items (fallback)
// ─────────────────────────────────────────────────────────────

function buildMockFlights(params: {
  origin: string;
  destination: string;
  pax: { adults: number; children: number };
  directFlights: boolean;
  seed: number;
}): QuoteItem[] {
  const { origin, destination, pax, directFlights, seed } = params;
  const legFare = 160 + (seed % 90);
  const childFactor = 0.75;
  const legBase = Math.round(
    legFare * pax.adults + legFare * childFactor * pax.children,
  );
  const directSurcharge = directFlights ? 1.12 : 1;
  const outboundBase = Math.round(legBase * directSurcharge);
  const returnBase = Math.round(legBase * (directFlights ? 1.1 : 0.98));

  const stopLabel = directFlights ? "directo" : "1 escala";
  const airlines = ["Iberia", "Vueling", "Air Europa", "Lufthansa"];
  const items: QuoteItem[] = [];

  for (let index = 0; index < 3; index += 1) {
    const airline = pickFrom(seed + index, airlines);
    const outboundPrice = Math.round(outboundBase * (1 + index * 0.08));
    const returnPrice = Math.round(returnBase * (1 + index * 0.06));

    items.push(
      draftItem({
        id: `flight-out-${index + 1}`,
        type: "flight",
        title: `Vuelo ${stopLabel} ${origin} → ${destination} · opción ${index + 1}`,
        provider: airline,
        price: outboundPrice,
        source: "mock",
        alternative: index > 0,
      }),
      draftItem({
        id: `flight-return-${index + 1}`,
        type: "flight",
        title: `Vuelo ${stopLabel} ${destination} → ${origin} · opción ${index + 1}`,
        provider: airline,
        price: returnPrice,
        source: "mock",
        alternative: index > 0,
      }),
    );
  }

  return items;
}

function buildMockHotels(params: {
  destination: string;
  nights: number;
  pax: { adults: number; children: number };
  hotelLevel: HotelLevel;
  accessibility: boolean;
  seed: number;
}): QuoteItem[] {
  const { destination, nights, pax, hotelLevel, accessibility, seed } = params;
  const rooms = Math.max(1, Math.ceil((pax.adults + pax.children) / 2));
  const ratePerNight = Math.round(
    HOTEL_RATE[hotelLevel] * (1 + (seed % 40) / 100),
  );
  const accessibilitySurcharge = accessibility ? 1.08 : 1;
  const base = Math.round(ratePerNight * nights * rooms * accessibilitySurcharge);
  const stars = HOTEL_STARS[hotelLevel];
  const hotelNames = [
    `Hotel ${stars}★ ${destination} Centro`,
    `Boutique ${destination}`,
    `Resort ${destination}`,
  ];
  const accessibilityNote = accessibility ? " · Accesible" : "";

  return hotelNames.map((name, index) =>
    draftItem({
      id: `hotel-${index + 1}`,
      type: "hotel",
      title: `${name} — ${nights} ${nights === 1 ? "noche" : "noches"}${accessibilityNote}`,
      provider: pickFrom(seed + 7 + index, [
        "Booking Partner",
        "Hotelbeds",
        "Contrato directo",
      ]),
      price: Math.round(base * (1 + index * 0.12)),
      source: "mock",
      alternative: index > 0,
    }),
  );
}

function parsePriceString(value: string | number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (!value) return 0;

  const match = String(value).match(/\d+(?:[.,]\d+)?/);
  if (!match) return 0;

  return Math.round(Number(match[0].replace(",", ".")));
}

function buildExperiences(params: {
  destination: string;
  durationDays: number;
  pax: { adults: number; children: number };
  seed: number;
}): QuoteItem[] {
  const { destination, durationDays, pax, seed } = params;
  const totalPax = pax.adults + pax.children;
  const perPerson = 35 + (seed % 25);

  const candidates: Array<
    Omit<QuoteItem, "markup" | "finalPrice"> & { durationHours: number | null }
  > = [
    {
      id: "exp-city-tour",
      type: "experience",
      title: `Tour guiado por ${destination}`,
      provider: pickFrom(seed + 11, ["Civitatis", "GetYourGuide", "Operador local"]),
      price: Math.round(perPerson * totalPax * 0.9),
      source: itemSource(seed, 3),
      durationHours: 3,
    },
  ];

  if (durationDays >= 4) {
    candidates.push({
      id: "exp-highlight",
      type: "experience",
      title: `Experiencia gastronómica en ${destination}`,
      provider: pickFrom(seed + 13, ["Viator", "Proveedor local", "Inventario agencia"]),
      price: Math.round((perPerson + 15) * Math.max(2, pax.adults)),
      source: itemSource(seed, 4),
      durationHours: 4,
    });
  }

  if (durationDays >= 7) {
    candidates.push({
      id: "exp-day-trip",
      type: "experience",
      title: `Excursión de día completo desde ${destination}`,
      provider: pickFrom(seed + 17, ["Tour operador regional", "Inventario agencia"]),
      price: Math.round((perPerson + 30) * totalPax),
      source: "inventory",
      durationHours: 8,
    });
  }

  const filtered = candidates.filter((item) =>
    matchesExperienceDurationForTrip(item.durationHours, durationDays),
  );

  return filtered
    .slice(0, 5)
    .map((item, index) => {
      const { durationHours: _durationHours, ...draft } = item;
      return draftItem({
        ...draft,
        alternative: index > 0,
      });
    });
}

// ─────────────────────────────────────────────────────────────
// Pricing
// ─────────────────────────────────────────────────────────────

export function marginCategoryForItemType(
  type: QuoteItemType,
): AgencyMarginCategory | null {
  if (type === "flight") return "vuelos";
  if (type === "hotel") return "hoteles";
  if (type === "experience") return "experiencias";
  if (type === "transfer") return "transfers";
  return null;
}

export function getMarginPercent(
  baseTotal: number,
  agencyMargins?: AgencyMargins,
  category?: AgencyMarginCategory,
): number {
  if (
    category &&
    agencyMargins?.[category] !== undefined &&
    Number.isFinite(agencyMargins[category])
  ) {
    return agencyMargins[category]!;
  }

  if (baseTotal > 3000) return 12;
  if (baseTotal > 1500) return 15;
  return 18;
}

function applyMargin(items: QuoteItem[], marginPercent: number): void {
  for (const item of items) {
    applyItemMargin(item, marginPercent);
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const HOTEL_RATE: Record<HotelLevel, number> = {
  budget: 72,
  standard: 110,
  premium: 165,
  luxury: 240,
};

const HOTEL_STARS: Record<HotelLevel, number> = {
  budget: 3,
  standard: 4,
  premium: 4,
  luxury: 5,
};

type DraftItem = Omit<QuoteItem, "markup" | "finalPrice">;

function draftItem(item: DraftItem): QuoteItem {
  return { ...item, markup: 0, finalPrice: item.price };
}

function itemSource(seed: number, offset: number): QuoteItemSource {
  const bucket = (seed + offset * 7) % 10;
  if (bucket < 5) return "mock";
  if (bucket < 8) return "inventory";
  return "api";
}

function buildQuoteId(
  input: ParsedTripInput,
  origin: string,
  destination: string,
): string {
  const key = `${origin}-${destination}-${input.dates.start}-${input.dates.end}`;
  const h = hashKey(key).toString(16).padStart(8, "0").slice(0, 8);
  return `TQ-${input.dates.start.replaceAll("-", "")}-${h}`;
}

function computeDurationDays(start: string, end: string): number {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 1;
  const diff = Math.ceil((endMs - startMs) / 86_400_000);
  return Math.max(1, diff);
}

function normalizePlace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePassengers(passengers: {
  adults: number;
  children: number;
}): { adults: number; children: number } {
  return {
    adults: Math.max(1, passengers.adults),
    children: Math.max(0, passengers.children),
  };
}

function hashKey(value: string): number {
  let hash = 2_166_136_261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function pickFrom<T>(seed: number, options: T[]): T {
  return options[seed % options.length];
}

function sumPrices(items: QuoteItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

function sumMarkups(items: QuoteItem[]): number {
  return items.reduce((sum, item) => sum + item.markup, 0);
}

function roundEur(value: number): number {
  return Math.round(value);
}

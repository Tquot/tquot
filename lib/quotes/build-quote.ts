/**
 * Quote builder: flights and hotels from search APIs when available, mock fallback otherwise.
 */

import type { FlightOption } from "@/app/api/search-flights/route";
import type { HotelOption } from "@/app/api/search-hotels/route";
import { getCityIATA } from "@/lib/airports";
import { buildFlightSearchParams } from "@/lib/flights/build-search-params";
import {
  resolveInventoryNetPrice,
  resolveInventoryProvider,
} from "@/lib/inventory/inventory-utils";
import type { InventoryQuoteRow } from "@/lib/inventory/search-for-quote";
import type { EnrichedTripRequest } from "@/lib/parser/airport-resolution";

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
}

// ─────────────────────────────────────────────────────────────
// Output
// ─────────────────────────────────────────────────────────────

export type QuoteItemType = "flight" | "hotel" | "experience";
export type QuoteItemSource = "mock" | "inventory" | "api";

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
  /** When true, shown as a selectable option but excluded from quote totals. */
  alternative?: boolean;
  /** Per-line margin %; drives markup and finalPrice when edited in the UI. */
  marginPercent?: number;
}

export type QuoteSelectionGroup = "flight-outbound" | "flight-return" | "hotel";

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
  flightsMockReason?: string;
  hotelsMockReason?: string;
  experiencesMockReason?: string;
}

export interface Quote {
  id: string;
  summary: QuoteSummary;
  flights: QuoteItem[];
  hotels: QuoteItem[];
  experiences: QuoteItem[];
  pricing: QuotePricing;
  _meta: QuoteMeta;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export async function buildQuote(input: ParsedTripInput): Promise<Quote> {
  console.log("[buildQuote] ParsedTripInput received", input);

  const origin = normalizePlace(input.origin);
  const destination = normalizePlace(input.destination);
  const durationDays = computeDurationDays(input.dates.start, input.dates.end);
  const nights = Math.max(1, durationDays - 1);
  const pax = normalizePassengers(input.passengers);
  const seed = hashKey(
    `${origin}|${destination}|${input.dates.start}|${input.dates.end}|${pax.adults}|${pax.children}|${input.preferences.hotelLevel}|${input.preferences.directFlights}|${input.preferences.accessibility}`,
  );

  const inventorySearch = fetchInventoryForQuote({
    destination,
    accessibility: input.preferences.accessibility,
    hotelLevel: input.preferences.hotelLevel,
  });

  const [flightsResult, hotelsResult, experiencesResult] = await Promise.all([
    buildFlightsFromApiOrMock({
      origin,
      destination,
      dates: input.dates,
      pax,
      directFlights: input.preferences.directFlights,
      seed,
      enrichedTrip: input.enrichedTrip,
      airportChoices: input.airportChoices,
    }),
    inventorySearch.then((inventory) =>
      buildHotelsFromInventoryOrApiOrMock({
        destination,
        dates: input.dates,
        nights,
        pax,
        hotelLevel: input.preferences.hotelLevel,
        accessibility: input.preferences.accessibility,
        seed,
        inventory,
      }),
    ),
    inventorySearch.then((inventory) =>
      buildExperiencesFromInventoryOrMock({
        destination,
        durationDays,
        pax,
        seed,
        accessibility: input.preferences.accessibility,
        hotelLevel: input.preferences.hotelLevel,
        inventory,
      }),
    ),
  ]);

  const flights = flightsResult.items;
  const hotels = hotelsResult.items;
  const experiences = experiencesResult.items;

  const selectableItems = [...flights, ...hotels, ...experiences];
  const pricedItems = [...itemsForPricing(flights), ...itemsForPricing(hotels), ...experiences];
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
      hotelsSource,
      experiencesSource,
      ...(flightsSource === "mock" && flightsResult.mockReason
        ? { flightsMockReason: flightsResult.mockReason }
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

async function postSearchApi<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T | null> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

async function searchFlightsApi(params: {
  origin: string;
  destination: string;
  date: string;
  adults: number;
}): Promise<FlightOption[]> {
  const data = await postSearchApi<{ flights?: FlightOption[]; fallback?: boolean }>(
    "/api/search-flights-duffel",
    {
      origin: params.origin,
      destination: params.destination,
      date: params.date,
      adults: params.adults,
    },
  );
  console.log("[buildQuote] /api/search-flights returned", {
    request: params,
    response: data,
  });
  if (!data || data.fallback) return [];
  const flights = data.flights;
  return Array.isArray(flights) && flights.length > 0 ? flights : [];
}

async function searchHotelsApi(params: {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
}): Promise<HotelOption[]> {
  const data = await postSearchApi<{ hotels?: HotelOption[]; fallback?: boolean }>(
    "/api/search-hotels",
    {
      destination: params.destination,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      adults: params.adults,
    },
  );
  console.log("[buildQuote] /api/search-hotels returned", {
    request: params,
    response: data,
  });
  if (!data || data.fallback) return [];
  const hotels = data.hotels;
  return Array.isArray(hotels) && hotels.length > 0 ? hotels : [];
}

function mapApiFlightToQuoteItem(
  flight: FlightOption,
  id: string,
  routeLabel: string,
  alternative = false,
): QuoteItem {
  const isDirect = String(flight.stops) === "0";
  const stopLabel = isDirect ? "directo" : `${flight.stops} escala(s)`;

  return draftItem({
    id,
    type: "flight",
    title: `${flight.airline} ${flight.flightNumber} · ${stopLabel} · ${routeLabel}`,
    provider: flight.airline,
    price: parsePriceString(flight.price),
    source: "api",
    alternative,
  });
}

function mapApiHotelToQuoteItem(
  hotel: HotelOption,
  nights: number,
  id: string,
  alternative = false,
): QuoteItem {
  const pricePerNight = parsePriceString(hotel.pricePerNight);

  return draftItem({
    id,
    type: "hotel",
    title: `${hotel.name} — ${nights} ${nights === 1 ? "noche" : "noches"} · ${hotel.roomType}`,
    provider: "Booking.com",
    price: Math.round(pricePerNight * nights),
    source: "api",
    alternative,
  });
}

export function itemsForPricing(items: QuoteItem[]) {
  return items.filter((item) => !item.alternative);
}

export function getQuoteSelectionGroup(itemId: string): QuoteSelectionGroup | null {
  if (itemId.startsWith("flight-out")) {
    return "flight-outbound";
  }

  if (itemId.startsWith("flight-return")) {
    return "flight-return";
  }

  if (itemId.startsWith("hotel-")) {
    return "hotel";
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
  const group = getQuoteSelectionGroup(selectedId);
  if (!group) {
    return;
  }

  const applyToList = (items: QuoteItem[]) => {
    for (const item of items) {
      if (getQuoteSelectionGroup(item.id) !== group) {
        continue;
      }

      item.alternative = item.id !== selectedId;
    }
  };

  applyToList(quote.flights);
  applyToList(quote.hotels);
}

export function pricedQuoteItemsFromQuote(quote: Quote): QuoteItem[] {
  return [
    ...itemsForPricing(quote.flights),
    ...itemsForPricing(quote.hotels),
    ...quote.experiences,
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
};

async function fetchInventoryForQuote(params: {
  destination: string;
  accessibility: boolean;
  hotelLevel: HotelLevel;
}): Promise<InventoryQuoteSearchResponse | null> {
  try {
    const response = await fetch("/api/inventory/quote-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      console.warn("[buildQuote] inventory quote-search failed", response.status);
      return null;
    }
    return (await response.json()) as InventoryQuoteSearchResponse;
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

async function buildFlightsFromApiOrMock(params: {
  origin: string;
  destination: string;
  dates: { start: string; end: string };
  pax: { adults: number; children: number };
  directFlights: boolean;
  seed: number;
  enrichedTrip?: EnrichedTripRequest;
  airportChoices?: AirportFlightChoices;
}): Promise<QuoteSectionBuildResult> {
  const { origin, destination, dates, pax, directFlights, seed } = params;
  const adults = pax.adults;

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
    searchFlightsApi({
      origin: originIata,
      destination: destinationIata,
      date: dates.start,
      adults,
    }),
    searchFlightsApi({
      origin: destinationIata,
      destination: originIata,
      date: dates.end,
      adults,
    }),
  ]);

  console.log("[buildQuote] flights before mapping to QuoteItem", {
    outbound: outboundFlights,
    return: returnFlights,
  });

  const items: QuoteItem[] = [];

  outboundFlights.slice(0, 3).forEach((flight, index) => {
    items.push(
      mapApiFlightToQuoteItem(
        flight,
        `flight-out-${index + 1}`,
        `${origin} → ${destination}`,
        index > 0,
      ),
    );
  });

  returnFlights.slice(0, 3).forEach((flight, index) => {
    items.push(
      mapApiFlightToQuoteItem(
        flight,
        `flight-return-${index + 1}`,
        `${destination} → ${origin}`,
        index > 0,
      ),
    );
  });

  if (items.length > 0) {
    return { items, source: "real" };
  }

  return {
    items: buildMockFlights({ origin, destination, pax, directFlights, seed }),
    source: "mock",
    mockReason: "Flight search API returned no results",
  };
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
}): Promise<QuoteSectionBuildResult> {
  const { destination, dates, nights, pax, hotelLevel, accessibility, seed, inventory } =
    params;

  if (inventory?.hotels.length) {
    console.log("[buildQuote] INV-PROPIO hotels", {
      count: inventory.hotels.length,
      destination,
    });
    return {
      items: inventory.hotels.map((row, index) =>
        mapInventoryHotelToQuoteItem(
          row,
          nights,
          `hotel-inv-${row.id.slice(0, 8)}`,
          index > 0,
        ),
      ),
      source: "real",
    };
  }

  const apiHotels = await searchHotelsApi({
    destination,
    checkIn: dates.start,
    checkOut: dates.end,
    adults: pax.adults,
  });

  console.log("[buildQuote] hotels before mapping to QuoteItem", apiHotels);

  if (apiHotels.length > 0) {
    return {
      items: apiHotels.slice(0, 3).map((hotel, index) =>
        mapApiHotelToQuoteItem(hotel, nights, `hotel-${index + 1}`, index > 0),
      ),
      source: "real",
    };
  }

  return {
    items: buildMockHotels({
      destination,
      nights,
      pax,
      hotelLevel,
      accessibility,
      seed,
    }),
    source: "mock",
    mockReason: "Hotel search API returned no results",
  };
}

async function buildExperiencesFromInventoryOrMock(params: {
  destination: string;
  durationDays: number;
  pax: { adults: number; children: number };
  seed: number;
  accessibility: boolean;
  hotelLevel: HotelLevel;
  inventory: InventoryQuoteSearchResponse | null;
}): Promise<QuoteSectionBuildResult> {
  const { destination, durationDays, pax, seed, inventory } = params;

  if (inventory?.experiences.length) {
    console.log("[buildQuote] INV-PROPIO experiences", {
      count: inventory.experiences.length,
      destination,
    });
    return {
      items: inventory.experiences.map((row, index) =>
        mapInventoryExperienceToQuoteItem(
          row,
          pax,
          `exp-inv-${row.id.slice(0, 8)}`,
          index > 0,
        ),
      ),
      source: "real",
    };
  }

  return {
    items: buildExperiences({ destination, durationDays, pax, seed }),
    source: "mock",
    mockReason: "No agency inventory experiences for destination",
  };
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

  const items: Omit<QuoteItem, "markup" | "finalPrice">[] = [
    {
      id: "exp-city-tour",
      type: "experience",
      title: `Tour guiado por ${destination}`,
      provider: pickFrom(seed + 11, ["Civitatis", "GetYourGuide", "Operador local"]),
      price: Math.round(perPerson * totalPax * 0.9),
      source: itemSource(seed, 3),
    },
  ];

  if (durationDays >= 4) {
    items.push({
      id: "exp-highlight",
      type: "experience",
      title: `Experiencia gastronómica en ${destination}`,
      provider: pickFrom(seed + 13, ["Viator", "Proveedor local", "Inventario agencia"]),
      price: Math.round((perPerson + 15) * Math.max(2, pax.adults)),
      source: itemSource(seed, 4),
    });
  }

  if (durationDays >= 7) {
    items.push({
      id: "exp-day-trip",
      type: "experience",
      title: `Excursión de día completo desde ${destination}`,
      provider: pickFrom(seed + 17, ["Tour operador regional", "Inventario agencia"]),
      price: Math.round((perPerson + 30) * totalPax),
      source: "inventory",
    });
  }

  return items.map((item) => draftItem(item));
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

/**
 * Quote builder: flights and hotels from search APIs when available, mock fallback otherwise.
 */

import type { FlightOption } from "@/app/api/search-flights/route";
import type { HotelOption } from "@/app/api/search-hotels/route";

// ─────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────

export type HotelLevel = "budget" | "standard" | "premium" | "luxury";

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
}

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

export interface Quote {
  id: string;
  summary: QuoteSummary;
  flights: QuoteItem[];
  hotels: QuoteItem[];
  experiences: QuoteItem[];
  pricing: QuotePricing;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export async function buildQuote(input: ParsedTripInput): Promise<Quote> {
  const origin = normalizePlace(input.origin);
  const destination = normalizePlace(input.destination);
  const durationDays = computeDurationDays(input.dates.start, input.dates.end);
  const nights = Math.max(1, durationDays - 1);
  const pax = normalizePassengers(input.passengers);
  const seed = hashKey(
    `${origin}|${destination}|${input.dates.start}|${input.dates.end}|${pax.adults}|${pax.children}|${input.preferences.hotelLevel}|${input.preferences.directFlights}|${input.preferences.accessibility}`,
  );

  const [flights, hotels] = await Promise.all([
    buildFlightsFromApiOrMock({
      origin,
      destination,
      dates: input.dates,
      pax,
      directFlights: input.preferences.directFlights,
      seed,
    }),
    buildHotelsFromApiOrMock({
      destination,
      dates: input.dates,
      nights,
      pax,
      hotelLevel: input.preferences.hotelLevel,
      accessibility: input.preferences.accessibility,
      seed,
    }),
  ]);

  const experiences = buildExperiences({
    destination,
    durationDays,
    pax,
    seed,
  });

  const allItems = [...flights, ...hotels, ...experiences];
  const baseTotal = sumPrices(allItems);
  const marginPercent = getMarginPercent(baseTotal);
  applyMargin(allItems, marginPercent);

  const margin = sumMarkups(allItems);
  const finalTotal = baseTotal + margin;

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
    "/api/search-flights",
    {
      origin: params.origin,
      destination: params.destination,
      date: params.date,
      adults: params.adults,
    },
  );
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
  if (!data || data.fallback) return [];
  const hotels = data.hotels;
  return Array.isArray(hotels) && hotels.length > 0 ? hotels : [];
}

function mapApiFlightToQuoteItem(
  flight: FlightOption,
  id: string,
  routeLabel: string,
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
  });
}

function mapApiHotelToQuoteItem(
  hotel: HotelOption,
  nights: number,
  id: string,
): QuoteItem {
  const pricePerNight = parsePriceString(hotel.pricePerNight);

  return draftItem({
    id,
    type: "hotel",
    title: `${hotel.name} — ${nights} ${nights === 1 ? "noche" : "noches"} · ${hotel.roomType}`,
    provider: "Booking.com",
    price: Math.round(pricePerNight * nights),
    source: "api",
  });
}

async function buildFlightsFromApiOrMock(params: {
  origin: string;
  destination: string;
  dates: { start: string; end: string };
  pax: { adults: number; children: number };
  directFlights: boolean;
  seed: number;
}): Promise<QuoteItem[]> {
  const { origin, destination, dates, pax, directFlights, seed } = params;
  const adults = pax.adults;

  const [outboundFlights, returnFlights] = await Promise.all([
    searchFlightsApi({
      origin,
      destination,
      date: dates.start,
      adults,
    }),
    searchFlightsApi({
      origin: destination,
      destination: origin,
      date: dates.end,
      adults,
    }),
  ]);

  const items: QuoteItem[] = [];

  if (outboundFlights[0]) {
    items.push(
      mapApiFlightToQuoteItem(
        outboundFlights[0],
        "flight-out",
        `${origin} → ${destination}`,
      ),
    );
  }

  if (returnFlights[0]) {
    items.push(
      mapApiFlightToQuoteItem(
        returnFlights[0],
        "flight-return",
        `${destination} → ${origin}`,
      ),
    );
  }

  if (items.length > 0) {
    const mockFlights = buildMockFlights({
      origin,
      destination,
      pax,
      directFlights,
      seed,
    });
    if (!items.some((item) => item.id === "flight-out")) {
      const mockOut = mockFlights.find((item) => item.id === "flight-out");
      if (mockOut) items.unshift(mockOut);
    }
    if (!items.some((item) => item.id === "flight-return")) {
      const mockReturn = mockFlights.find((item) => item.id === "flight-return");
      if (mockReturn) items.push(mockReturn);
    }
    return items;
  }

  return buildMockFlights({ origin, destination, pax, directFlights, seed });
}

async function buildHotelsFromApiOrMock(params: {
  destination: string;
  dates: { start: string; end: string };
  nights: number;
  pax: { adults: number; children: number };
  hotelLevel: HotelLevel;
  accessibility: boolean;
  seed: number;
}): Promise<QuoteItem[]> {
  const { destination, dates, nights, pax, hotelLevel, accessibility, seed } =
    params;

  const apiHotels = await searchHotelsApi({
    destination,
    checkIn: dates.start,
    checkOut: dates.end,
    adults: pax.adults,
  });

  if (apiHotels[0]) {
    return [mapApiHotelToQuoteItem(apiHotels[0], nights, "hotel-main")];
  }

  return buildMockHotels({
    destination,
    nights,
    pax,
    hotelLevel,
    accessibility,
    seed,
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
  const airline = pickFrom(seed, ["Iberia", "Vueling", "Air Europa", "Lufthansa"]);

  return [
    draftItem({
      id: "flight-out",
      type: "flight",
      title: `Vuelo ${stopLabel} ${origin} → ${destination}`,
      provider: airline,
      price: outboundBase,
      source: "mock",
    }),
    draftItem({
      id: "flight-return",
      type: "flight",
      title: `Vuelo ${stopLabel} ${destination} → ${origin}`,
      provider: airline,
      price: returnBase,
      source: "mock",
    }),
  ];
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
  const hotelName = pickFrom(seed + 3, [
    `Hotel ${stars}★ ${destination} Centro`,
    `Boutique ${destination}`,
    `Resort ${destination}`,
  ]);
  const accessibilityNote = accessibility ? " · Accesible" : "";

  return [
    draftItem({
      id: "hotel-main",
      type: "hotel",
      title: `${hotelName} — ${nights} ${nights === 1 ? "noche" : "noches"}${accessibilityNote}`,
      provider: pickFrom(seed + 7, ["Booking Partner", "Hotelbeds", "Contrato directo"]),
      price: base,
      source: "mock",
    }),
  ];
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

export function getMarginPercent(baseTotal: number): number {
  if (baseTotal > 3000) return 12;
  if (baseTotal > 1500) return 15;
  return 18;
}

function applyMargin(items: QuoteItem[], marginPercent: number): void {
  for (const item of items) {
    item.markup = roundEur(item.price * (marginPercent / 100));
    item.finalPrice = item.price + item.markup;
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

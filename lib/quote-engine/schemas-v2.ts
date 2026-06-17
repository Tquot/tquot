import type { HotelLevel, ParsedTripInput } from "@/lib/quotes/build-quote";

export interface TripLeg {
  id: string;
  arrivalDate: string;
  departureDate: string;
  origin?: string;
  destination: string;
  needsTransport?: "train" | "car" | "flight" | "none";
}

export type TripBudget =
  | { kind: "unlimited" }
  | { kind: "tier"; tier: "budget" | "mid" | "premium" | "luxury" }
  | { kind: "exact"; amount: number; currency: string }
  | { kind: "range"; min: number; max: number; currency: string }
  | { kind: "unspecified" };

export interface ParsedTripInputV2 {
  travelers: {
    adults: number;
    children: Array<{ age: number }>;
  };
  legs: TripLeg[];
  budget: TripBudget;
  preferences: {
    themes: string[];
    audience?: string;
  };
}

const DEFAULT_LEG_ID = "leg-1";

const HOTEL_LEVEL_TO_TIER: Record<
  HotelLevel,
  Extract<TripBudget, { kind: "tier" }>["tier"]
> = {
  budget: "budget",
  standard: "mid",
  premium: "premium",
  luxury: "luxury",
};

function budgetFromParsed(parsed: ParsedTripInput): TripBudget {
  if (parsed.budget !== undefined && Number.isFinite(parsed.budget)) {
    return { kind: "exact", amount: parsed.budget, currency: "EUR" };
  }
  return { kind: "tier", tier: HOTEL_LEVEL_TO_TIER[parsed.preferences.hotelLevel] };
}

function themesFromParsed(parsed: ParsedTripInput): string[] {
  const themes: string[] = [];
  if (parsed.preferences.accessibility) themes.push("accesibilidad");
  if (parsed.preferences.directFlights) themes.push("vuelos directos");
  return themes;
}

export function toParsedTripInputV2(parsed: ParsedTripInput): ParsedTripInputV2 {
  const childCount = parsed.passengers.children;
  const children = Array.from({ length: childCount }, () => ({ age: 10 }));

  return {
    travelers: {
      adults: parsed.passengers.adults,
      children,
    },
    legs: [
      {
        id: DEFAULT_LEG_ID,
        arrivalDate: parsed.dates.start,
        departureDate: parsed.dates.end,
        origin: parsed.origin,
        destination: parsed.destination,
      },
    ],
    budget: budgetFromParsed(parsed),
    preferences: {
      themes: themesFromParsed(parsed),
    },
  };
}

export const DEFAULT_TRIP_LEG_ID = DEFAULT_LEG_ID;

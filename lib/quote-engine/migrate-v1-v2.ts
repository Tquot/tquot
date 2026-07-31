import { nanoid } from "nanoid";
import type { ParsedTripInput, HotelLevel } from "@/lib/quotes/build-quote";
import type { ParsedTripInputV2, BudgetConstraint } from "./schemas-v2";
import { DEFAULT_TRIP_LEG_ID } from "./schemas-v2";

interface V1Shape {
  destination: string;
  checkIn: string;
  checkOut: string;
  pax: { adults: number; children?: number };
  origin?: string;
  hotelTier?: string;
  theme?: string;
  preferredAccommodation?: string;
}

export function isV1(input: unknown): input is V1Shape {
  if (typeof input !== "object" || input === null) return false;
  return "destination" in input && !("legs" in input) && !("version" in input);
}

export function migrateV1ToV2(v1: V1Shape, rawInput = ""): ParsedTripInputV2 {
  const childAges = Array.from({ length: v1.pax.children ?? 0 }, () => ({ age: 10 }));

  return {
    version: 2,
    travelers: {
      adults: v1.pax.adults,
      children: childAges,
      infants: 0,
    },
    legs: [
      {
        id: nanoid(),
        order: 0,
        origin: v1.origin,
        destination: v1.destination,
        arrivalDate: v1.checkIn,
        departureDate: v1.checkOut,
        needsAccommodation: true,
        needsTransport: "flight",
      },
    ],
    budget: v1.hotelTier
      ? { kind: "tier", tier: hotelTierToBudgetTier(v1.hotelTier) }
      : { kind: "unspecified" },
    preferences: {
      hotelStyles: [],
      themes: v1.theme ? [v1.theme] : [],
      locationPriorities: [],
      locationLandmarks: [],
      amenities: [],
      accessibility: [],
    },
    notes: v1.preferredAccommodation,
    rawInput,
    parsingGaps:
      v1.pax.children && v1.pax.children > 0 ? ["missing_children_ages"] : [],
  };
}

function hotelTierToBudgetTier(tier: string): "budget" | "mid" | "premium" | "luxury" {
  const lower = tier.toLowerCase();
  if (/lujo|luxury|5/.test(lower)) return "luxury";
  if (/premium|4/.test(lower)) return "premium";
  if (/budget|económic|economic|low/.test(lower)) return "budget";
  return "mid";
}

const HOTEL_LEVEL_TO_TIER: Record<
  HotelLevel,
  Extract<BudgetConstraint, { kind: "tier" }>["tier"]
> = {
  budget: "budget",
  standard: "mid",
  premium: "premium",
  luxury: "luxury",
};

function budgetFromParsed(parsed: ParsedTripInput): BudgetConstraint {
  if (parsed.budget !== undefined && Number.isFinite(parsed.budget)) {
    return {
      kind: "exact",
      amount: parsed.budget,
      currency: "EUR",
      perPerson: false,
    };
  }
  return {
    kind: "tier",
    tier: HOTEL_LEVEL_TO_TIER[parsed.preferences.hotelLevel],
  };
}

function themesFromParsed(parsed: ParsedTripInput): string[] {
  const themes: string[] = [];
  if (parsed.preferences.accessibility) themes.push("accesibilidad");
  if (parsed.preferences.directFlights) themes.push("vuelos directos");
  return themes;
}

/** Converts the current build-quote ParsedTripInput into schema v2. */
export function toParsedTripInputV2(
  parsed: ParsedTripInput | ParsedTripInputV2,
): ParsedTripInputV2 {
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "version" in parsed &&
    (parsed as ParsedTripInputV2).version === 2 &&
    Array.isArray((parsed as ParsedTripInputV2).legs)
  ) {
    return parsed as ParsedTripInputV2;
  }

  const v1 = parsed as ParsedTripInput;
  const childCount = v1.passengers.children;
  const children = Array.from({ length: childCount }, () => ({ age: 10 }));

  return {
    version: 2,
    travelers: {
      adults: v1.passengers.adults,
      children,
      infants: 0,
    },
    legs: [
      {
        id: DEFAULT_TRIP_LEG_ID,
        order: 0,
        arrivalDate: v1.dates.start,
        departureDate: v1.dates.end,
        origin: v1.origin,
        destination: v1.destination,
        needsAccommodation: v1.includeHotels ?? true,
        needsTransport: v1.includeFlights === false ? "none" : "flight",
      },
    ],
    budget: budgetFromParsed(v1),
    preferences: {
      hotelStyles: [],
      themes: themesFromParsed(v1),
      locationPriorities: [],
      locationLandmarks: [],
      amenities: [],
      accessibility: v1.preferences.accessibility
        ? ["wheelchair_accessible"]
        : [],
      ...(v1.preferences.accessibilityProfile
        ? { accessibilityProfile: v1.preferences.accessibilityProfile }
        : v1.preferences.accessibility
          ? {
              accessibilityProfile: {
                required: {
                  hotel: ["accessible_room", "accessible_bathroom", "elevator"],
                  experience: ["wheelchair_accessible"],
                  transfer: ["wheelchair_accessible_vehicle"],
                },
                preferred: { hotel: [], experience: [], transfer: [] },
              },
            }
          : {}),
    },
    rawInput: "",
    parsingGaps: childCount > 0 ? ["missing_children_ages"] : [],
  };
}

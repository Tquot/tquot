import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import type { ParsedTripInput } from "@/lib/quotes/build-quote";

/**
 * Fechas relativas: el demo debe verse siempre futuro.
 * Client-safe (no server-only) so the conversation store can hydrate without Claude.
 */
export function demoDates() {
  const now = new Date();
  const arrival = new Date(now.getFullYear(), now.getMonth() + 1, 12);
  const departure = new Date(arrival);
  departure.setDate(departure.getDate() + 4);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    arrivalDate: iso(arrival) || "",
    departureDate: iso(departure) || "",
  };
}

const DEMO_ORIGIN = "Madrid";
const DEMO_DESTINATION = "Roma";
const DEMO_RAW =
  "Pareja a Roma 4 noches, zona Trastevere, hotel 4*, vuelo desde Madrid. Presupuesto 1500 €/persona.";

/** Pre-baked legs[] v2 trip — used by demo-stream / composeQuote. */
export function buildDemoParsed(): ParsedTripInputV2 {
  const { arrivalDate, departureDate } = demoDates();
  const start = arrivalDate || "";
  const end = departureDate || "";

  return {
    version: 2,
    legs: [
      {
        id: "demo-leg-1",
        order: 0,
        origin: DEMO_ORIGIN,
        destination: DEMO_DESTINATION,
        arrivalDate: start,
        departureDate: end,
        needsAccommodation: true,
        needsTransport: "flight",
        legPreferences: {
          hotelStyles: [],
          locationPriorities: ["central"],
          locationLandmarks: ["Trastevere"],
          themes: [],
          amenities: [],
          accessibility: [],
        },
      },
    ],
    travelers: {
      adults: 2,
      children: [],
      infants: 0,
    },
    budget: {
      kind: "exact",
      amount: 1500,
      currency: "EUR",
      perPerson: true,
    },
    preferences: {
      hotelStyles: [],
      locationPriorities: ["central"],
      locationLandmarks: ["Trastevere"],
      themes: [],
      amenities: [],
      accessibility: [],
    },
    notes: "source:demo",
    rawInput: DEMO_RAW,
    parsingGaps: [],
  };
}

/**
 * Store / BUILD_START expect build-quote ParsedTripInput (v1).
 * Must include real origin/destination/dates strings — casting v2 leaves
 * dates.start undefined and triggers ".startsWith" crashes downstream.
 */
export function buildDemoParsedForStore(): ParsedTripInput {
  const { arrivalDate, departureDate } = demoDates();

  return {
    origin: DEMO_ORIGIN,
    destination: DEMO_DESTINATION,
    dates: {
      start: arrivalDate || "",
      end: departureDate || "",
    },
    passengers: {
      adults: 2,
      children: 0,
    },
    budget: 1500,
    preferences: {
      hotelLevel: "premium",
      directFlights: false,
      accessibility: false,
    },
    includeHotels: true,
    includeExperiences: true,
    includeFlights: true,
    locale: "es",
  };
}

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
  return { arrivalDate: iso(arrival), departureDate: iso(departure) };
}

/** Pre-baked legs[] v2 trip — used for PARSE_COMPLETE in demo mode. */
export function buildDemoParsed(): ParsedTripInputV2 {
  const { arrivalDate, departureDate } = demoDates();
  const travelers = {
    adults: 2,
    children: [] as Array<{ age: number }>,
    infants: 0,
  };

  return {
    version: 2,
    legs: [
      {
        id: "demo-leg-1",
        order: 0,
        origin: "Madrid",
        destination: "Roma",
        arrivalDate,
        departureDate,
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
    travelers,
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
    rawInput:
      "Pareja a Roma 4 noches, zona Trastevere, hotel 4*, vuelo desde Madrid. Presupuesto 1500 €/persona.",
    parsingGaps: [],
  };
}

/**
 * Store actions are typed as build-quote ParsedTripInput (v1).
 * Demo injects v2; canvas / build stream accept it via toParsedTripInputV2 + demo:true.
 */
export function buildDemoParsedForStore(): ParsedTripInput {
  return buildDemoParsed() as unknown as ParsedTripInput;
}

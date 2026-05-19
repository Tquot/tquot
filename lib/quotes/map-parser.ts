import type { TripRequest } from "@/lib/parser/schema";
import type { HotelLevel, ParsedTripInput } from "./build-quote";

function addDays(isoDate: string, days: number): string {
  const next = new Date(isoDate);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function hotelCategoryToLevel(stars?: number): HotelLevel {
  if (!stars || stars <= 3) return "budget";
  if (stars === 4) return "standard";
  if (stars === 5) return "luxury";
  return "premium";
}

function inferDirectFlights(specialRequests?: string): boolean {
  if (!specialRequests) return false;
  return /\b(?:directo|direct|sin escala|non-?stop)\b/i.test(specialRequests);
}

/** Maps parser `TripRequest` to the deterministic quote builder input. */
export function tripRequestToParsedTripInput(
  trip: TripRequest,
  options?: { fallbackOrigin?: string },
): ParsedTripInput | null {
  const destination = trip.destination?.trim();
  if (!destination) return null;

  const today = new Date().toISOString().slice(0, 10);
  const start = trip.departureDate ?? today;
  const end = trip.returnDate ?? addDays(start, 3);

  return {
    origin: trip.origin?.trim() || options?.fallbackOrigin || "Madrid",
    destination,
    dates: { start, end },
    passengers: {
      adults: trip.adults ?? 2,
      children: trip.children ?? 0,
    },
    budget: trip.budget,
    preferences: {
      hotelLevel: hotelCategoryToLevel(trip.hotelCategory),
      directFlights: inferDirectFlights(trip.specialRequests),
      accessibility: trip.accessibilityNeeds ?? false,
    },
  };
}

/** Fallback mapper when the parser API is unavailable (local regex extract). */
export function localParseToParsedTripInput(
  parsed: {
    destination: string;
    origin?: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    includeFlights: boolean;
  },
): ParsedTripInput {
  return {
    origin: parsed.origin?.trim() || "Madrid",
    destination: parsed.destination,
    dates: { start: parsed.checkIn, end: parsed.checkOut },
    passengers: { adults: parsed.adults, children: 0 },
    preferences: {
      hotelLevel: "standard",
      directFlights: parsed.includeFlights,
      accessibility: false,
    },
  };
}

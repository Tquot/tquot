import type { ParsedTripInput } from "@/lib/quotes/build-quote";

export interface TripLeg {
  id: string;
  arrivalDate: string;
  departureDate: string;
}

export interface ParsedTripInputV2 {
  travelers: {
    adults: number;
    children: Array<{ age: number }>;
  };
  legs: TripLeg[];
}

const DEFAULT_LEG_ID = "leg-1";

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
      },
    ],
  };
}

export const DEFAULT_TRIP_LEG_ID = DEFAULT_LEG_ID;

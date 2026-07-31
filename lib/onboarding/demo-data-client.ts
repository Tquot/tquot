import type { ParsedTripInput } from "@/lib/quotes/build-quote";

/**
 * Client-safe v1 trip stub used only to enter the "building" state.
 * When demo:true is sent to the build stream, the server ignores this body
 * and streams pre-baked demo results.
 */
export function buildDemoParsedForStore(): ParsedTripInput {
  const now = new Date();
  const arrival = new Date(now.getFullYear(), now.getMonth() + 1, 12);
  const departure = new Date(arrival);
  departure.setDate(departure.getDate() + 4);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  return {
    origin: "Madrid",
    destination: "Roma",
    dates: {
      start: iso(arrival),
      end: iso(departure),
    },
    passengers: { adults: 2, children: 0 },
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

import type { FlightOption } from "@/app/api/search-flights/route";
import type { HotelOption } from "@/app/api/search-hotels/route";
import type { TripRequest } from "./schema";

type SearchFailure = {
  service: "hotels" | "flights";
  error: string;
};

export type ParserSearchResult = {
  hotels: HotelOption[];
  flights: FlightOption[];
  failures: SearchFailure[];
};

function getCheckOut(data: TripRequest) {
  return data.returnDate ?? "";
}

async function postJson<T>(
  origin: string,
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? `${path} request failed`);
  }

  return payload as T;
}

export async function runParserSearchOrchestrator(
  data: TripRequest,
  origin: string,
): Promise<ParserSearchResult> {
  const destination = data.destination;
  const checkIn = data.departureDate ?? "";
  const checkOut = getCheckOut(data);
  const adults = data.adults ?? 1;
  const failures: SearchFailure[] = [];
  let hotels: HotelOption[] = [];
  let flights: FlightOption[] = [];

  if (destination && checkIn && checkOut) {
    try {
      const result = await postJson<{ hotels: HotelOption[] }>(
        origin,
        "/api/search-hotels",
        { destination, checkIn, checkOut, adults },
      );
      hotels = result.hotels.slice(0, 3);
    } catch (error) {
      failures.push({
        service: "hotels",
        error: error instanceof Error ? error.message : "Hotel search failed",
      });
    }
  }

  const originLocation = data.origin ?? "";
  if (originLocation && destination && checkIn) {
    try {
      const result = await postJson<{ flights: FlightOption[] }>(
        origin,
        "/api/search-flights",
        { origin: originLocation, destination, date: checkIn, adults },
      );
      flights = result.flights.slice(0, 3);
    } catch (error) {
      failures.push({
        service: "flights",
        error: error instanceof Error ? error.message : "Flight search failed",
      });
    }
  }

  return { hotels, flights, failures };
}

export function shouldRequireHumanReview(data: TripRequest) {
  return data.accessibilityNeeds === true;
}

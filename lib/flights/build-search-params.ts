import type { EnrichedTripRequest } from "@/lib/parser/airport-resolution";
import { getAirportsForCity } from "@/lib/airports/search";

export interface FlightSearchParams {
  origins: string[];
  destinations: string[];
  departureDate: string;
  returnDate: string | null;
  adults: number;
  children: number;
  infants: number;
}

export function buildFlightSearchParams(
  trip: EnrichedTripRequest,
  choices: { origin: string | "all"; destination: string | "all" }
): FlightSearchParams | { error: string } {
  if (!trip._resolved.origin) return { error: "Origen sin resolver" };
  if (!trip._resolved.destination) return { error: "Destino sin resolver" };
  if (!trip.departureDate) {
    return { error: "Fecha de salida obligatoria" };
  }

  return {
    origins: expandChoice(trip._resolved.origin.cityKey, choices.origin),
    destinations: expandChoice(
      trip._resolved.destination.cityKey,
      choices.destination
    ),
    departureDate: trip.departureDate,
    returnDate: trip.returnDate ?? null,
    adults: trip.adults ?? 2,
    children: trip.children ?? 0,
    infants: 0,
  };
}

function expandChoice(cityKey: string, choice: string | "all"): string[] {
  if (choice === "all") {
    return getAirportsForCity(cityKey).map((a) => a.iata);
  }
  return [choice];
}

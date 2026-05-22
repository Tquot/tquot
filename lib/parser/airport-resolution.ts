import { resolveCity } from "@/lib/airports/search";
import type { TripRequest } from "./schema";

export interface ResolvedLocation {
  cityKey: string;
  cityDisplayName: string;
  country: string;
  airports: Array<{ iata: string; name: string; city: string }>;
  isMultiAirport: boolean;
  /**
   * Si el parser ya devolvió un IATA concreto, lo respetamos.
   * Si solo devolvió ciudad, queda en null hasta que el agente elija.
   */
  selectedIata: string | null;
  /** true cuando el agente DEBE confirmar antes de buscar vuelos */
  needsAgentChoice: boolean;
}

export interface EnrichedTripRequest extends TripRequest {
  _resolved: {
    origin: ResolvedLocation | null;
    destination: ResolvedLocation | null;
  };
}

export function enrichWithAirports(trip: TripRequest): EnrichedTripRequest {
  const resolvedOrigin = resolveLocation(trip.origin);
  const resolvedDestination = resolveLocation(trip.destination);
  console.log("[enrichWithAirports]", {
    origin: trip.origin,
    destination: trip.destination,
    resolvedOrigin,
    resolvedDestination,
  });
  return {
    ...trip,
    _resolved: {
      origin: resolvedOrigin,
      destination: resolvedDestination,
    },
  };
}

function resolveLocation(loc: string | undefined): ResolvedLocation | null {
  if (!loc?.trim()) return null;

  const resolution = resolveCity(loc);
  if (!resolution) return null;

  return {
    cityKey: resolution.cityKey,
    cityDisplayName: resolution.cityDisplayName,
    country: resolution.country,
    airports: resolution.airports.map((a) => ({
      iata: a.iata,
      name: a.name,
      city: a.city,
    })),
    isMultiAirport: resolution.isMultiAirport,
    selectedIata: resolution.isMultiAirport
      ? null
      : resolution.airports[0].iata,
    needsAgentChoice: resolution.isMultiAirport,
  };
}

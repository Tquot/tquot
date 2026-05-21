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
  return {
    ...trip,
    _resolved: {
      origin: resolveLocation(trip.origin),
      destination: resolveLocation(trip.destination),
    },
  };
}

function resolveLocation(loc: TripRequest["origin"]): ResolvedLocation | null {
  if (!loc) return null;

  // El parser ya devolvió IATA específico → respetar
  if (loc.iataCode) {
    const resolution = resolveCity(loc.iataCode);
    if (resolution) {
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
        selectedIata: loc.iataCode,
        needsAgentChoice: false,
      };
    }
  }

  // No hay IATA: resolver por ciudad
  const queries = [loc.city, loc.raw].filter(Boolean) as string[];
  for (const q of queries) {
    const resolution = resolveCity(q);
    if (resolution) {
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
  }

  return null;
}

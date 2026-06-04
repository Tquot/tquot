import { getCityIATA } from "@/lib/airports";
import { getIndexes } from "@/lib/airports/index";
import {
  resolveDestinationCoordinates,
  resolveHardcodedDestinationCoordinates,
} from "@/lib/geo/resolve-destination-coordinates";
import type { EnrichedTripRequest } from "@/lib/parser/airport-resolution";
import { buildFlightSearchParams } from "@/lib/flights/build-search-params";
import type { AirportFlightChoices } from "@/lib/quotes/build-quote";

export const TRANSFER_MIN_DISTANCE_KM = 25;

function normalizePlace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function coordinatesMatch(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): boolean {
  const epsilon = 0.001;
  return (
    Math.abs(a.lat - b.lat) < epsilon && Math.abs(a.lng - b.lng) < epsilon
  );
}

function resolveDestinationIata(params: {
  destination: string;
  enrichedTrip?: EnrichedTripRequest;
  airportChoices?: AirportFlightChoices;
}): string | null {
  if (params.enrichedTrip) {
    const destination = params.enrichedTrip._resolved.destination;
    const selected =
      params.airportChoices?.destination ??
      destination?.selectedIata ??
      destination?.airports[0]?.iata ??
      null;
    if (selected && selected !== "all") {
      return selected;
    }

    const flightParams = buildFlightSearchParams(
      params.enrichedTrip,
      params.airportChoices ?? {
        origin:
          params.enrichedTrip._resolved.origin?.selectedIata ??
          params.enrichedTrip._resolved.origin?.airports[0]?.iata ??
          "all",
        destination: selected ?? "all",
      },
    );
    if (!("error" in flightParams) && flightParams.destinations[0]) {
      return flightParams.destinations[0];
    }
  }

  const iata = getCityIATA(params.destination);
  return iata || null;
}

function destinationNameCandidates(params: {
  destination: string;
  enrichedTrip?: EnrichedTripRequest;
}): string[] {
  const names = [
    params.destination,
    params.enrichedTrip?._resolved.destination?.cityDisplayName,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }
  return unique;
}

function resolveDestinationCityCoordinates(params: {
  destination: string;
  enrichedTrip?: EnrichedTripRequest;
}): { lat: number; lng: number; source: string } | null {
  const names = destinationNameCandidates(params);

  for (const name of names) {
    const hardcoded = resolveHardcodedDestinationCoordinates(name);
    if (hardcoded) {
      return { ...hardcoded, source: "hardcoded:city-center" };
    }
  }

  for (const name of names) {
    const fromHelper = resolveDestinationCoordinates(name);
    if (fromHelper) {
      return {
        ...fromHelper,
        source: "resolveDestinationCoordinates",
      };
    }
  }

  return null;
}

export function shouldIncludeTransfers(params: {
  origin: string;
  destination: string;
  enrichedTrip?: EnrichedTripRequest;
  airportChoices?: AirportFlightChoices;
}): boolean {
  const origin = normalizePlace(params.origin);
  const destination = normalizePlace(params.destination);
  if (!origin || !destination || origin === destination) {
    return false;
  }

  const originIata = getCityIATA(params.origin);
  const destinationIataCode = getCityIATA(params.destination);
  if (originIata && destinationIataCode && originIata === destinationIataCode) {
    return false;
  }

  const arrivalIata = resolveDestinationIata(params);
  if (!arrivalIata) {
    console.warn("[buildQuote] transfers skipped: no destination airport IATA");
    return false;
  }

  const airport = getIndexes().byIata.get(arrivalIata);
  if (!airport) {
    console.warn("[buildQuote] transfers skipped: missing airport coordinates", {
      arrivalIata,
      destination,
    });
    return false;
  }

  const airportCoords = {
    lat: airport.latitude,
    lng: airport.longitude,
  };
  const cityCoords = resolveDestinationCityCoordinates({
    destination,
    enrichedTrip: params.enrichedTrip,
  });

  if (!cityCoords) {
    console.log("[buildQuote] transfer distance (km)", {
      destination,
      arrivalIata,
      arrivalAirport: airport.name,
      airportCoords,
      cityCoords: null,
      cityCoordsSource: null,
      distanceKm: null,
      thresholdKm: TRANSFER_MIN_DISTANCE_KM,
      includeTransfers: true,
      reason: "unknown_city_center",
    });
    return true;
  }

  if (coordinatesMatch(airportCoords, cityCoords)) {
    console.log("[buildQuote] transfer distance (km)", {
      destination,
      arrivalIata,
      arrivalAirport: airport.name,
      airportCoords,
      cityCoords: { lat: cityCoords.lat, lng: cityCoords.lng },
      cityCoordsSource: cityCoords.source,
      distanceKm: 0,
      thresholdKm: TRANSFER_MIN_DISTANCE_KM,
      includeTransfers: true,
      reason: "city_center_matches_airport",
    });
    return true;
  }

  const distanceKm = haversineKm(airportCoords, cityCoords);
  const includeTransfers = distanceKm > TRANSFER_MIN_DISTANCE_KM;

  console.log("[buildQuote] transfer distance (km)", {
    destination,
    arrivalIata,
    arrivalAirport: airport.name,
    airportCoords,
    cityCoords: { lat: cityCoords.lat, lng: cityCoords.lng },
    cityCoordsSource: cityCoords.source,
    distanceKm: Math.round(distanceKm * 10) / 10,
    thresholdKm: TRANSFER_MIN_DISTANCE_KM,
    includeTransfers,
  });

  return includeTransfers;
}

export function resolveTransferLocationLabels(params: {
  destination: string;
  enrichedTrip?: EnrichedTripRequest;
  airportChoices?: AirportFlightChoices;
}): { pickupLocation: string; dropoffLocation: string; destinationIata: string | null } {
  const destinationIata = resolveDestinationIata(params);
  const airport = destinationIata
    ? getIndexes().byIata.get(destinationIata)
    : undefined;
  const city = resolveDestinationCityCoordinates({
    destination: params.destination,
    enrichedTrip: params.enrichedTrip,
  });

  const pickupLocation = airport
    ? `${airport.name} (${airport.iata})`
    : destinationIata
      ? `Aeropuerto ${destinationIata}`
      : "Aeropuerto de llegada";

  const dropoffLocation =
    params.destination.trim() ||
    params.enrichedTrip?._resolved.destination?.cityDisplayName?.trim() ||
    (city ? "Centro de destino" : "Destino del viaje");

  return { pickupLocation, dropoffLocation, destinationIata };
}

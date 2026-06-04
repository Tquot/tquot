import { getCityIATA } from "@/lib/airports";
import { getIndexes } from "@/lib/airports/index";
import { resolveDestinationCoordinates } from "@/lib/geo/resolve-destination-coordinates";
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

function resolveDestinationCityCoordinates(params: {
  destination: string;
  enrichedTrip?: EnrichedTripRequest;
}): { lat: number; lng: number; source: string } | null {
  const names = [
    params.destination,
    params.enrichedTrip?._resolved.destination?.cityDisplayName,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  const seen = new Set<string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const fromHelper = resolveDestinationCoordinates(name);
    if (fromHelper) {
      return {
        ...fromHelper,
        source: "resolveDestinationCoordinates",
      };
    }

    const city = resolveCity(name);
    if (!city) continue;

    const airports = city.airports.filter(
      (ap) => Number.isFinite(ap.latitude) && Number.isFinite(ap.longitude),
    );
    if (airports.length === 0) continue;

    if (airports.length === 1) {
      const ap = airports[0];
      return {
        lat: ap.latitude,
        lng: ap.longitude,
        source: `airports:iata:${ap.iata}`,
      };
    }

    const lat =
      airports.reduce((sum, ap) => sum + ap.latitude, 0) / airports.length;
    const lng =
      airports.reduce((sum, ap) => sum + ap.longitude, 0) / airports.length;
    return {
      lat,
      lng,
      source: `airports:centroid:${city.cityKey}`,
    };
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
  const cityCoords = resolveDestinationCityCoordinates({
    destination,
    enrichedTrip: params.enrichedTrip,
  });
  if (!airport || !cityCoords) {
    console.warn("[buildQuote] transfers skipped: missing coordinates", {
      arrivalIata,
      destination,
      hasAirport: Boolean(airport),
      hasCity: Boolean(cityCoords),
    });
    return false;
  }

  const airportCoords = {
    lat: airport.latitude,
    lng: airport.longitude,
  };
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

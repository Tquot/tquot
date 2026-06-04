import { resolveCity } from "@/lib/airports/search";
import type { CityResolution } from "@/lib/airports/types";

function coordinatesFromCityResolution(
  city: CityResolution,
): { lat: number; lng: number } | null {
  const airports = city.airports.filter(
    (ap) => Number.isFinite(ap.latitude) && Number.isFinite(ap.longitude),
  );
  if (airports.length === 0) return null;
  if (airports.length === 1) {
    return { lat: airports[0].latitude, lng: airports[0].longitude };
  }

  const lat =
    airports.reduce((sum, ap) => sum + ap.latitude, 0) / airports.length;
  const lng =
    airports.reduce((sum, ap) => sum + ap.longitude, 0) / airports.length;
  return { lat, lng };
}

function normalizeCityKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const HARDCODED_CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  atenas: { lat: 37.9838, lng: 23.7275 },
  athens: { lat: 37.9838, lng: 23.7275 },
  bangkok: { lat: 13.7563, lng: 100.5018 },
  barcelona: { lat: 41.3874, lng: 2.1686 },
  berlin: { lat: 52.52, lng: 13.405 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  dublin: { lat: 53.3498, lng: -6.2603 },
  estambul: { lat: 41.0082, lng: 28.9784 },
  istanbul: { lat: 41.0082, lng: 28.9784 },
  lanzarote: { lat: 28.963, lng: -13.605 },
  lisboa: { lat: 38.7223, lng: -9.1393 },
  lisbon: { lat: 38.7223, lng: -9.1393 },
  londres: { lat: 51.5074, lng: -0.1278 },
  london: { lat: 51.5074, lng: -0.1278 },
  madrid: { lat: 40.4168, lng: -3.7038 },
  milan: { lat: 45.4642, lng: 9.19 },
  milano: { lat: 45.4642, lng: 9.19 },
  munich: { lat: 48.1351, lng: 11.582 },
  munchen: { lat: 48.1351, lng: 11.582 },
  new_york: { lat: 40.7128, lng: -74.006 },
  nueva_york: { lat: 40.7128, lng: -74.006 },
  paris: { lat: 48.8566, lng: 2.3522 },
  praga: { lat: 50.0755, lng: 14.4378 },
  prague: { lat: 50.0755, lng: 14.4378 },
  rom: { lat: 41.9028, lng: 12.4964 },
  roma: { lat: 41.9028, lng: 12.4964 },
  rome: { lat: 41.9028, lng: 12.4964 },
  venecia: { lat: 45.4408, lng: 12.3155 },
  venice: { lat: 45.4408, lng: 12.3155 },
  viena: { lat: 48.2082, lng: 16.3738 },
  vienna: { lat: 48.2082, lng: 16.3738 },
};

export function resolveDestinationCoordinates(
  destination: string,
): { lat: number; lng: number } | null {
  const trimmed = destination.trim();
  if (!trimmed) return null;

  const city = resolveCity(trimmed);
  if (city) {
    const fromAirports = coordinatesFromCityResolution(city);
    if (fromAirports) return fromAirports;
  }

  const key = normalizeCityKey(trimmed);
  const hardcoded = HARDCODED_CITY_COORDINATES[key];
  if (hardcoded) return hardcoded;

  return null;
}

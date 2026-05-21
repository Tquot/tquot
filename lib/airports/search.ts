import { getIndexes } from "./index";
import type { Airport, CityResolution } from "./types";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Resuelve un texto libre del agente a una ciudad y sus aeropuertos.
 */
export function resolveCity(query: string): CityResolution | null {
  if (!query) return null;
  const trimmed = query.trim();
  const indexes = getIndexes();

  // Caso 1: input es un IATA exacto (3 letras)
  if (/^[A-Za-z]{3}$/.test(trimmed)) {
    const iata = trimmed.toUpperCase();
    const ap = indexes.byIata.get(iata);
    if (ap) {
      const cityKey = indexes.airportToCityKey.get(iata);
      if (cityKey) return buildResolution(cityKey);
      return {
        cityKey: `solo:${iata}`,
        cityDisplayName: ap.city || ap.name,
        country: ap.countryCode,
        airports: [ap],
        isMultiAirport: false,
      };
    }
  }

  // Caso 2: alias del diccionario o ciudad fallback
  const normalized = normalize(trimmed);
  const cityKey = indexes.aliasToCityKey.get(normalized);
  if (cityKey) return buildResolution(cityKey);

  // Caso 3: prefijo (>= 3 chars)
  if (normalized.length >= 3) {
    for (const [alias, key] of indexes.aliasToCityKey) {
      if (alias.startsWith(normalized)) return buildResolution(key);
    }
  }

  return null;
}

function buildResolution(cityKey: string): CityResolution | null {
  const indexes = getIndexes();
  const airports = indexes.byCityKey.get(cityKey);
  if (!airports || airports.length === 0) return null;
  const first = airports[0];
  return {
    cityKey,
    cityDisplayName: first.city,
    country: first.countryCode,
    airports,
    isMultiAirport: airports.length > 1,
  };
}

/**
 * Devuelve todos los aeropuertos de una ciudad ya resuelta.
 * Útil para llamar a la API de vuelos con "todos los aeropuertos de Londres".
 */
export function getAirportsForCity(cityKey: string): Airport[] {
  return getIndexes().byCityKey.get(cityKey) ?? [];
}

/**
 * Autocompletar — devuelve hasta N ciudades que matchean el prefijo.
 */
export function suggestCities(query: string, limit = 8): CityResolution[] {
  if (!query || query.length < 2) return [];
  const normalized = normalize(query);
  const indexes = getIndexes();
  const seen = new Set<string>();
  const results: CityResolution[] = [];

  for (const [alias, cityKey] of indexes.aliasToCityKey) {
    if (results.length >= limit) break;
    if (seen.has(cityKey)) continue;
    if (alias.startsWith(normalized)) {
      const res = buildResolution(cityKey);
      if (res) {
        results.push(res);
        seen.add(cityKey);
      }
    }
  }
  return results;
}

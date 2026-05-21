import { airports as rawAirports } from "./data";
import { CITY_GROUPS } from "./city-groups";
import type { Airport } from "./types";

// ─── Normalización ───
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

interface Indexes {
  byIata: Map<string, Airport>;
  byCityKey: Map<string, Airport[]>;
  aliasToCityKey: Map<string, string>;
  airportToCityKey: Map<string, string>;
}

let indexes: Indexes | null = null;

function buildIndexes(): Indexes {
  const byIata = new Map<string, Airport>();
  const byCityKey = new Map<string, Airport[]>();
  const aliasToCityKey = new Map<string, string>();
  const airportToCityKey = new Map<string, string>();

  for (const a of rawAirports) {
    if (a.iata && a.iata.length === 3) {
      byIata.set(a.iata.toUpperCase(), a);
    }
  }

  // Diccionario manual: prioridad
  for (const group of CITY_GROUPS) {
    for (const alias of group.aliases) {
      aliasToCityKey.set(normalize(alias), group.key);
    }

    const airports: Airport[] = [];
    for (const iata of group.airports) {
      const ap = byIata.get(iata);
      if (ap) {
        airports.push(ap);
        airportToCityKey.set(iata, group.key);
      } else {
        console.warn(
          `[airports] IATA ${iata} en city-groups no encontrado en OpenFlights`
        );
      }
    }
    byCityKey.set(group.key, airports);
  }

  // Fallback: ciudades NO en diccionario manual con 2+ aeropuertos
  const fallbackGroups = new Map<string, Airport[]>();
  for (const a of rawAirports) {
    if (!a.iata || a.iata.length !== 3) continue;
    if (airportToCityKey.has(a.iata)) continue;
    if (!a.city) continue;

    const key = `${a.countryCode}:${normalize(a.city)}`;
    if (!fallbackGroups.has(key)) fallbackGroups.set(key, []);
    fallbackGroups.get(key)!.push(a);
  }

  for (const [key, airports] of fallbackGroups) {
    if (airports.length < 2) continue;
    airports.sort((a, b) => a.iata.localeCompare(b.iata));

    byCityKey.set(key, airports);
    aliasToCityKey.set(normalize(airports[0].city), key);
    for (const ap of airports) airportToCityKey.set(ap.iata, key);
  }

  return { byIata, byCityKey, aliasToCityKey, airportToCityKey };
}

export function getIndexes(): Indexes {
  if (!indexes) indexes = buildIndexes();
  return indexes;
}

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OPENFLIGHTS_AIRPORTS_URL =
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat";
const OPENFLIGHTS_COUNTRIES_URL =
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/countries.dat";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "lib", "airports.ts");

const SPANISH_CITY_ALIASES = {
  "nueva york": "new york",
  "londres": "london",
  "tokio": "tokyo",
  "paris": "paris",
  "madrid": "madrid",
  "cancun": "cancun",
  "cancún": "cancun",
  "ciudad de mexico": "mexico city",
  "ciudad de méxico": "mexico city",
  "mexico df": "mexico city",
  "méxico df": "mexico city",
  "pekín": "beijing",
  "pekin": "beijing",
  "shanghái": "shanghai",
  "seúl": "seoul",
  "el cairo": "cairo",
  "moscú": "moscow",
  "moscu": "moscow",
  "atenas": "athens",
  "estambul": "istanbul",
  "roma": "rome",
  "milan": "milan",
  "milán": "milan",
  "venecia": "venice",
  "florencia": "florence",
  "nápoles": "naples",
  "napoles": "naples",
  "lisboa": "lisbon",
  "oporto": "porto",
  "bruselas": "brussels",
  "berlín": "berlin",
  "berlin": "berlin",
  "munich": "munich",
  "múnich": "munich",
  "fráncfort": "frankfurt",
  "francfort": "frankfurt",
  "hamburgo": "hamburg",
  "colonia": "cologne",
  "viena": "vienna",
  "zúrich": "zurich",
  "zurich": "zurich",
  "ginebra": "geneva",
  "copenhague": "copenhagen",
  "estocolmo": "stockholm",
  "varsovia": "warsaw",
  "cracovia": "krakow",
  "praga": "prague",
  "bucarest": "bucharest",
  "belgrado": "belgrade",
  "dublín": "dublin",
  "dublin": "dublin",
  "edimburgo": "edinburgh",
  "los ángeles": "los angeles",
  "los angeles": "los angeles",
  "san francisco": "san francisco",
  "nueva orleans": "new orleans",
  "filadelfia": "philadelphia",
  "montreal": "montreal",
  "la habana": "havana",
  "ciudad de panama": "panama city",
  "ciudad de panamá": "panama city",
  "ciudad de guatemala": "guatemala city",
  "bogotá": "bogota",
  "bogota": "bogota",
  "medellín": "medellin",
  "medellin": "medellin",
  "cuzco": "cusco",
  "río de janeiro": "rio de janeiro",
  "rio de janeiro": "rio de janeiro",
  "san pablo": "sao paulo",
  "são paulo": "sao paulo",
  "sao paulo": "sao paulo",
  "buenos aires": "buenos aires",
  "santiago de chile": "santiago",
  "sidney": "sydney",
  "sídney": "sydney",
  "melburne": "melbourne",
  "adelaida": "adelaide",
};

const PRIMARY_AIRPORT_NAME_TOKENS = [
  "heathrow",
  "charles de gaulle",
  "john f kennedy",
  "narita",
  "barajas",
  "el prat",
  "cancun international",
  "ben gurion",
  "changi",
  "dubai international",
  "hamad international",
  "schiphol",
  "fiumicino",
  "suvarnabhumi",
  "guarulhos",
  "ezeiza",
];

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      fields.push(field);
      field = "";
      continue;
    }

    field += character;
  }

  fields.push(field);
  return fields;
}

function isValidIata(value) {
  return /^[A-Z]{3}$/.test(value);
}

function isValidIcao(value) {
  return /^[A-Z]{4}$/.test(value);
}

function isNullField(value) {
  return !value || value === "\\N";
}

function normalizeSearchKey(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function airportPriority(airport) {
  const haystack = `${airport.name} ${airport.city} ${airport.country}`.toLowerCase();
  let score = 0;

  if (haystack.includes("international")) score += 50;
  if (haystack.includes("airport")) score += 10;
  if (haystack.includes("capital")) score += 8;
  if (haystack.includes("main")) score += 8;
  if (haystack.includes("metropolitan")) score += 6;
  if (haystack.includes("regional")) score -= 8;
  if (haystack.includes("municipal")) score -= 12;
  if (haystack.includes("heliport")) score -= 25;
  if (haystack.includes("seaplane")) score -= 25;
  if (haystack.includes("military")) score -= 30;
  if (haystack.includes("air base")) score -= 30;
  if (haystack.includes("closed")) score -= 50;

  for (const token of PRIMARY_AIRPORT_NAME_TOKENS) {
    if (haystack.includes(token)) {
      score += 100;
      break;
    }
  }

  return score;
}

function parseCountries(csv) {
  const countryCodes = {};

  for (const line of csv.split(/\r?\n/u).filter(Boolean)) {
    const fields = parseCsvLine(line);
    const countryName = fields[0];
    const countryCode = fields[1];

    if (!isNullField(countryName) && !isNullField(countryCode) && isValidCountryCode(countryCode)) {
      countryCodes[countryName] = countryCode;
    }
  }

  return countryCodes;
}

function isValidCountryCode(value) {
  return /^[A-Z]{2}$/.test(value);
}

function parseAirports(csv, countryCodes) {
  return csv
    .split(/\r?\n/u)
    .filter(Boolean)
    .map(parseCsvLine)
    .filter((fields) => fields.length >= 14)
    .map((fields) => {
      const iata = fields[4].toUpperCase();
      const country = fields[3];

      return {
        id: Number(fields[0]),
        iata,
        icao:
          isNullField(fields[5]) || !isValidIcao(fields[5].toUpperCase())
            ? ""
            : fields[5].toUpperCase(),
        name: fields[1],
        city: fields[2],
        country,
        countryCode: countryCodes[country] ?? "",
        latitude: Number(fields[6]),
        longitude: Number(fields[7]),
        timezone: isNullField(fields[11]) ? "" : fields[11],
      };
    })
    .filter((airport) => isValidIata(airport.iata))
    .sort((left, right) => {
      const priorityDelta = airportPriority(right) - airportPriority(left);
      if (priorityDelta !== 0) return priorityDelta;

      return left.id - right.id;
    });
}

function dedupeByIata(airports) {
  const seen = new Set();
  const deduped = [];

  for (const airport of airports) {
    if (seen.has(airport.iata)) {
      continue;
    }

    seen.add(airport.iata);
    deduped.push({
      iata: airport.iata,
      icao: airport.icao,
      name: airport.name,
      city: airport.city,
      country: airport.country,
      countryCode: airport.countryCode,
      latitude: airport.latitude,
      longitude: airport.longitude,
      timezone: airport.timezone,
    });
  }

  return deduped;
}

function buildLookup(airports) {
  const lookup = {};

  for (const airport of airports) {
    const searchableValues = unique([
      airport.iata,
      airport.city,
      airport.name,
      airport.country,
      `${airport.city} ${airport.country}`,
      `${airport.name} ${airport.city}`,
      `${airport.name} ${airport.country}`,
    ]);

    for (const value of searchableValues) {
      const key = normalizeSearchKey(value);
      if (key) {
        lookup[key] ??= airport.iata;
      }
    }
  }

  for (const [alias, city] of Object.entries(SPANISH_CITY_ALIASES)) {
    const aliasKey = normalizeSearchKey(alias);
    const cityKey = normalizeSearchKey(city);
    if (aliasKey && cityKey && lookup[cityKey]) {
      lookup[aliasKey] = lookup[cityKey];
    }
  }

  return Object.fromEntries(Object.entries(lookup).sort(([left], [right]) => left.localeCompare(right)));
}

function buildOutput(lookup, airports) {
  return `// Generated by scripts/build-airports.mjs from OpenFlights airports.dat.
// Source: ${OPENFLIGHTS_AIRPORTS_URL}
// Do not edit this file manually; run \`node scripts/build-airports.mjs\`.

export const AIRPORT_IATA_LOOKUP: Record<string, string> = ${JSON.stringify(lookup, null, 2)};

export const airports: {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
}[] = ${JSON.stringify(airports)};

function normalizeSearchKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getCityIATA(cityName: string): string {
  const trimmed = cityName.trim();
  if (!trimmed) {
    return cityName;
  }

  return AIRPORT_IATA_LOOKUP[normalizeSearchKey(trimmed)] ?? cityName;
}
`;
}

async function main() {
  const [airportsResponse, countriesResponse] = await Promise.all([
    fetch(OPENFLIGHTS_AIRPORTS_URL),
    fetch(OPENFLIGHTS_COUNTRIES_URL),
  ]);

  if (!airportsResponse.ok) {
    throw new Error(
      `Failed to download OpenFlights airports: ${airportsResponse.status} ${airportsResponse.statusText}`,
    );
  }

  if (!countriesResponse.ok) {
    throw new Error(
      `Failed to download OpenFlights countries: ${countriesResponse.status} ${countriesResponse.statusText}`,
    );
  }

  const [airportsCsv, countriesCsv] = await Promise.all([
    airportsResponse.text(),
    countriesResponse.text(),
  ]);

  const countryCodes = parseCountries(countriesCsv);
  const parsedAirports = parseAirports(airportsCsv, countryCodes);
  const airports = dedupeByIata(parsedAirports);
  const lookup = buildLookup(parsedAirports);
  const output = buildOutput(lookup, airports);

  await writeFile(outputPath, output, "utf8");

  console.log(
    `Generated ${airports.length} airports and ${Object.keys(lookup).length} lookup keys from ${parsedAirports.length} OpenFlights rows with valid IATA.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

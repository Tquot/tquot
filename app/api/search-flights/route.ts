import { NextResponse } from "next/server";
import { getCityIATA } from "@/lib/airports";

const FLIGHTS_SKY_API_URL =
  "https://flights-sky.p.rapidapi.com/flights/search-one-way";
const FLIGHTS_SKY_RAPIDAPI_HOST = "flights-sky.p.rapidapi.com";
const FLIGHTS_SKY_MARKET = "ES";
const FLIGHTS_SKY_LOCALE = "en-GB";
const FLIGHTS_SKY_CURRENCY = "EUR";

type SearchFlightsRequest = {
  origin?: unknown;
  destination?: unknown;
  date?: unknown;
  adults?: unknown;
};

export type FlightLayover = {
  airport: string;
  iata: string;
  duration: string;
};

export type FlightOption = {
  price: string;
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number | string;
  stopoverLocation: string;
  departureDate: string;
  departureDateISO: string;
  originIata: string;
  destinationIata: string;
  originCity: string;
  destinationCity: string;
  airlineLogoUrl: string;
  cabinClass: string;
  baggageIncluded: string;
  layovers: FlightLayover[];
  priceNumeric: number;
};

function parsePriceNumeric(price: string): number {
  const match = price.match(/\d+(?:[.,]\d+)?/);
  if (!match) return 0;
  return Math.round(Number(match[0].replace(",", ".")));
}

function formatDepartureDateFromIso(iso: string): { display: string; isoDate: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { display: "", isoDate: "" };
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return {
    display: `${day}/${month}/${year}`,
    isoDate: `${year}-${month}-${day}`,
  };
}

type Airport = {
  code: string;
  city: string;
  country: string;
  region: "europe" | "americas" | "asia" | "africa" | "middle-east";
};

const AIRPORTS: Airport[] = [
  { code: "MAD", city: "Madrid", country: "Spain", region: "europe" },
  { code: "BCN", city: "Barcelona", country: "Spain", region: "europe" },
  { code: "OVD", city: "Asturias", country: "Spain", region: "europe" },
  { code: "VLL", city: "Valladolid", country: "Spain", region: "europe" },
  { code: "SVQ", city: "Seville", country: "Spain", region: "europe" },
  { code: "PMI", city: "Palma de Mallorca", country: "Spain", region: "europe" },
  { code: "CDG", city: "Paris", country: "France", region: "europe" },
  { code: "ORY", city: "Paris", country: "France", region: "europe" },
  { code: "LHR", city: "London", country: "United Kingdom", region: "europe" },
  { code: "LGW", city: "London", country: "United Kingdom", region: "europe" },
  { code: "FCO", city: "Rome", country: "Italy", region: "europe" },
  { code: "MXP", city: "Milan", country: "Italy", region: "europe" },
  { code: "LIS", city: "Lisbon", country: "Portugal", region: "europe" },
  { code: "AMS", city: "Amsterdam", country: "Netherlands", region: "europe" },
  { code: "FRA", city: "Frankfurt", country: "Germany", region: "europe" },
  { code: "MUC", city: "Munich", country: "Germany", region: "europe" },
  { code: "JFK", city: "New York", country: "United States", region: "americas" },
  { code: "MIA", city: "Miami", country: "United States", region: "americas" },
  { code: "LAX", city: "Los Angeles", country: "United States", region: "americas" },
  { code: "CUN", city: "Cancun", country: "Mexico", region: "americas" },
  { code: "MEX", city: "Mexico City", country: "Mexico", region: "americas" },
  { code: "EZE", city: "Buenos Aires", country: "Argentina", region: "americas" },
  { code: "HND", city: "Tokyo", country: "Japan", region: "asia" },
  { code: "NRT", city: "Tokyo", country: "Japan", region: "asia" },
  { code: "MLE", city: "Male", country: "Maldives", region: "asia" },
  { code: "DXB", city: "Dubai", country: "United Arab Emirates", region: "middle-east" },
  { code: "RAK", city: "Marrakech", country: "Morocco", region: "africa" },
];

const AIRPORT_ALIASES: Record<string, Airport> = AIRPORTS.reduce(
  (aliasesByKey, airport) => {
    const aliases = [airport.code, airport.city, `${airport.city} ${airport.country}`];

    if (airport.code === "CDG") aliases.push("paris", "paris charles de gaulle");
    if (airport.code === "CUN") aliases.push("cancun", "cancun mexico", "cancún");
    if (airport.code === "HND") aliases.push("tokyo", "tokio");
    if (airport.code === "JFK") aliases.push("new york", "nueva york", "nyc");
    if (airport.code === "OVD") aliases.push("ribadesella", "asturias");
    if (airport.code === "SVQ") aliases.push("sevilla");
    if (airport.code === "MLE") aliases.push("maldives", "maldivas");
    if (airport.code === "PMI") aliases.push("mallorca", "palma");

    for (const alias of aliases) {
      const key = normalizePlaceKey(alias);
      aliasesByKey[key] ??= airport;
    }

    return aliasesByKey;
  },
  {} as Record<string, Airport>,
);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizePlaceKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveAirport(value: string): Airport | null {
  const trimmed = getCityIATA(value.trim());
  const iataCode = trimmed.match(/^[A-Za-z]{3}$/)?.[0]?.toUpperCase();

  if (iataCode) {
    return AIRPORT_ALIASES[normalizePlaceKey(iataCode)] ?? {
      code: iataCode,
      city: iataCode,
      country: "Unknown",
      region: "europe",
    };
  }

  return AIRPORT_ALIASES[normalizePlaceKey(trimmed)] ?? null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getStringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "Unknown";
}

function formatDuration(minutes: unknown) {
  if (typeof minutes !== "number" || !Number.isFinite(minutes)) {
    return getStringValue(minutes);
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function formatTime(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Unknown";
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return value;
}

function getPrice(itinerary: Record<string, unknown>) {
  const price = itinerary.price;

  if (typeof price === "string" || typeof price === "number") {
    return String(price);
  }

  const priceObject = asRecord(price);
  return getStringValue(
    priceObject.formatted,
    priceObject.amount,
    priceObject.raw,
    priceObject.value,
  );
}

function getFirstLeg(itinerary: Record<string, unknown>) {
  const legs = itinerary.legs;
  return Array.isArray(legs) && legs[0] && typeof legs[0] === "object"
    ? asRecord(legs[0])
    : {};
}

function getAirline(leg: Record<string, unknown>) {
  const carriers = asRecord(leg.carriers);
  const marketing = carriers.marketing;

  if (Array.isArray(marketing) && marketing[0]) {
    const firstCarrier = asRecord(marketing[0]);
    return getStringValue(firstCarrier.name, firstCarrier.alternateId);
  }

  const operating = carriers.operating;
  if (Array.isArray(operating) && operating[0]) {
    const firstCarrier = asRecord(operating[0]);
    return getStringValue(firstCarrier.name, firstCarrier.alternateId);
  }

  return "Unknown";
}

function getSegments(leg: Record<string, unknown>) {
  return Array.isArray(leg.segments)
    ? leg.segments.map(asRecord)
    : [];
}

function getFlightNumber(leg: Record<string, unknown>) {
  const segments = getSegments(leg);
  const firstSegment = segments[0] ?? {};
  const marketingCarrier = asRecord(firstSegment.marketingCarrier);
  const carrierCode = getStringValue(
    marketingCarrier.alternateId,
    marketingCarrier.id,
    firstSegment.marketingCarrierCode,
  );
  const flightNumber = getStringValue(
    firstSegment.flightNumber,
    firstSegment.marketingFlightNumber,
  );

  if (carrierCode === "Unknown") {
    return flightNumber;
  }

  if (flightNumber === "Unknown") {
    return carrierCode;
  }

  return `${carrierCode} ${flightNumber}`;
}

function getStopoverLocation(leg: Record<string, unknown>) {
  const segments = getSegments(leg);

  if (segments.length <= 1) {
    return "Direct";
  }

  const stopovers = segments.slice(0, -1).map((segment) => {
    const destination = asRecord(segment.destination);
    return getStringValue(
      destination.city,
      destination.name,
      destination.displayCode,
      segment.destinationDisplayCode,
    );
  });

  return stopovers.filter((stopover) => stopover !== "Unknown").join(", ") || "Unknown";
}

function normalizeFlightOptions(payload: unknown): FlightOption[] {
  const response = asRecord(payload);
  const data = asRecord(response.data);
  const itineraries =
    (Array.isArray(data.itineraries) && data.itineraries) ||
    (Array.isArray(response.itineraries) && response.itineraries) ||
    [];

  return itineraries.slice(0, 3).map((itinerary): FlightOption => {
    const itineraryObject = asRecord(itinerary);
    const leg = getFirstLeg(itineraryObject);

    const price = getPrice(itineraryObject);
    const departureIso =
      typeof leg.departure === "string" ? leg.departure : "";
    const { display: departureDate, isoDate: departureDateISO } =
      formatDepartureDateFromIso(departureIso);
    const segments = getSegments(leg);
    const firstSegment = segments[0] ?? {};
    const lastSegment = segments[segments.length - 1] ?? firstSegment;
    const originAirport = asRecord(firstSegment.origin);
    const destinationAirport = asRecord(lastSegment.destination);
    const stopCount =
      typeof leg.stopCount === "number" || typeof leg.stopCount === "string"
        ? leg.stopCount
        : "Unknown";

    return {
      price,
      airline: getAirline(leg),
      flightNumber: getFlightNumber(leg),
      departureTime: formatTime(leg.departure),
      arrivalTime: formatTime(leg.arrival),
      duration: formatDuration(leg.durationInMinutes),
      stops: stopCount,
      stopoverLocation: getStopoverLocation(leg),
      departureDate,
      departureDateISO,
      originIata: getStringValue(
        originAirport.displayCode,
        originAirport.iata,
        firstSegment.originDisplayCode,
      ),
      destinationIata: getStringValue(
        destinationAirport.displayCode,
        destinationAirport.iata,
        lastSegment.destinationDisplayCode,
      ),
      originCity: getStringValue(originAirport.city, originAirport.name),
      destinationCity: getStringValue(
        destinationAirport.city,
        destinationAirport.name,
      ),
      airlineLogoUrl: "",
      cabinClass: "economy",
      baggageIncluded: "",
      layovers: [],
      priceNumeric: parsePriceNumeric(price),
    };
  });
}

function getErrorMessage(payload: unknown, fallback: string) {
  const response = asRecord(payload);
  const data = asRecord(response.data);

  return getStringValue(
    response.message,
    response.error,
    response.errors,
    data.message,
    data.error,
    fallback,
  );
}

function seededNumber(seed: string, min: number, max: number) {
  const hash = Array.from(seed).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );

  return min + (hash % (max - min + 1));
}

function addMinutes(time: string, minutesToAdd: number) {
  const [hours, minutes] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const nextHours = Math.floor(normalized / 60);
  const nextMinutes = normalized % 60;

  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
}

function estimateDuration(origin: Airport | null, destination: Airport | null) {
  if (!origin || !destination) {
    return 150;
  }

  if (origin.region === destination.region) {
    return origin.country === destination.country ? 90 : 140;
  }

  if (
    [origin.region, destination.region].includes("americas") &&
    [origin.code, destination.code].includes("CUN")
  ) {
    return 610;
  }

  if ([origin.region, destination.region].includes("americas")) {
    return 520;
  }

  if ([origin.region, destination.region].includes("asia")) {
    return 780;
  }

  return 360;
}

function getMockAirlines(destination: Airport | null) {
  if (destination?.code === "CUN") {
    return [
      { airline: "Iberojet", prefix: "E9" },
      { airline: "World2Fly", prefix: "2W" },
      { airline: "Air Europa", prefix: "UX" },
    ];
  }

  if (destination?.region === "americas") {
    return [
      { airline: "Iberia", prefix: "IB" },
      { airline: "Air Europa", prefix: "UX" },
      { airline: "American Airlines", prefix: "AA" },
    ];
  }

  return [
    { airline: "Iberia", prefix: "IB" },
    { airline: "Vueling", prefix: "VY" },
    { airline: "Air Europa", prefix: "UX" },
  ];
}

function getMockStopover(origin: Airport | null, destination: Airport | null) {
  const candidates =
    destination?.region === "americas"
      ? ["Lisbon (LIS)", "Miami (MIA)", "New York (JFK)"]
      : ["Madrid (MAD)", "Barcelona (BCN)", "Paris (CDG)"];

  return (
    candidates.find(
      (candidate) =>
        !candidate.includes(`(${origin?.code ?? ""})`) &&
        !candidate.includes(`(${destination?.code ?? ""})`),
    ) ?? candidates[0]
  );
}

function createMockFlights(originValue: string, destinationValue: string): FlightOption[] {
  const origin = resolveAirport(originValue);
  const destination = resolveAirport(destinationValue);
  const routeSeed = `${origin?.code ?? originValue}-${destination?.code ?? destinationValue}`;
  const baseDuration = estimateDuration(origin, destination);
  const directAvailable = baseDuration < 720;
  const airlines = getMockAirlines(destination);
  const departures = ["09:15", "13:40", "18:10"];

  return airlines.map((airline, index): FlightOption => {
    const stops = directAvailable && index < 2 ? 0 : 1;
    const durationMinutes = baseDuration + index * 25 + (stops ? 75 : 0);
    const price = seededNumber(`${routeSeed}-${airline.prefix}`, 120, 420) + index * 35;

    const today = new Date();
    const departureDateISO = today.toISOString().slice(0, 10);
    const [year, month, day] = departureDateISO.split("-");

    return {
      price: `EUR ${price}`,
      airline: airline.airline,
      flightNumber: `${airline.prefix} ${seededNumber(`${routeSeed}-${index}`, 1000, 8999)}`,
      departureTime: departures[index],
      arrivalTime: addMinutes(departures[index], durationMinutes),
      duration: formatDuration(durationMinutes),
      stops,
      stopoverLocation: stops ? getMockStopover(origin, destination) : "Direct",
      departureDate: `${day}/${month}/${year}`,
      departureDateISO,
      originIata: origin?.code ?? "",
      destinationIata: destination?.code ?? "",
      originCity: origin?.city ?? originValue,
      destinationCity: destination?.city ?? destinationValue,
      airlineLogoUrl: "",
      cabinClass: "Economy",
      baggageIncluded: "1 maleta de mano",
      layovers: [],
      priceNumeric: price,
    };
  });
}

function fallbackFlights(message: string, origin: string, destination: string) {
  return NextResponse.json({
    flights: createMockFlights(origin, destination),
    fallback: true,
    error: message,
  });
}

export async function POST(request: Request) {
  const rapidApiKey = process.env.RAPIDAPI_KEY;

  let body: SearchFlightsRequest;

  try {
    body = (await request.json()) as SearchFlightsRequest;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const { origin, destination, date, adults } = body;

  if (
    !isNonEmptyString(origin) ||
    !isNonEmptyString(destination) ||
    !isNonEmptyString(date)
  ) {
    return NextResponse.json(
      { error: "origin, destination and date are required." },
      { status: 400 },
    );
  }

  const adultCount = Number(adults ?? 1);

  if (!Number.isInteger(adultCount) || adultCount < 1) {
    return NextResponse.json(
      { error: "adults must be a positive integer." },
      { status: 400 },
    );
  }

  if (!rapidApiKey) {
    console.error("[search-flights] Missing RAPIDAPI_KEY; returning fallback.");
    return fallbackFlights(
      "Missing RAPIDAPI_KEY environment variable.",
      origin,
      destination,
    );
  }

  const originIata = getCityIATA(origin.trim());
  const destinationIata = getCityIATA(destination.trim());
  const searchParams = new URLSearchParams({
    fromEntityId: originIata,
    toEntityId: destinationIata,
    departDate: date.trim(),
    adults: String(adultCount),
    market: FLIGHTS_SKY_MARKET,
    locale: FLIGHTS_SKY_LOCALE,
    currency: FLIGHTS_SKY_CURRENCY,
  });

  const requestUrl = `${FLIGHTS_SKY_API_URL}?${searchParams}`;
  console.log("[search-flights] RapidAPI request", {
    url: requestUrl,
    params: Object.fromEntries(searchParams),
  });

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-host": FLIGHTS_SKY_RAPIDAPI_HOST,
        "x-rapidapi-key": rapidApiKey,
      },
    });

    const responseText = await response.text();
    console.log("[search-flights] RapidAPI response", {
      status: response.status,
      ok: response.ok,
      body: responseText,
    });

    let payload: unknown;

    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch {
      payload = { raw: responseText };
    }

    if (!response.ok) {
      const message = getErrorMessage(payload, responseText || "Failed to search flights.");
      console.error("[search-flights] RapidAPI error", {
        status: response.status,
        message,
        payload,
      });

      return fallbackFlights(message, origin, destination);
    }

    const flights = normalizeFlightOptions(payload);

    if (flights.length === 0) {
      console.error("[search-flights] RapidAPI returned no flight options", {
        payload,
      });

      return fallbackFlights("RapidAPI returned no flight options.", origin, destination);
    }

    return NextResponse.json({ flights });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected flight search error.";

    console.error("[search-flights] Request failed", error);

    return fallbackFlights(message, origin, destination);
  }
}

import { NextResponse } from "next/server";

const SKYSCANNER_API_URL =
  "https://skyscanner80.p.rapidapi.com/api/v1/flights/search-one-way";
const RAPIDAPI_HOST = "skyscanner80.p.rapidapi.com";

type SearchFlightsRequest = {
  origin?: unknown;
  destination?: unknown;
  date?: unknown;
  adults?: unknown;
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
};

const MOCK_FLIGHTS: FlightOption[] = [
  {
    price: "EUR 189",
    airline: "Iberia",
    flightNumber: "IB 3171",
    departureTime: "09:15",
    arrivalTime: "11:30",
    duration: "2h 15m",
    stops: 0,
    stopoverLocation: "Direct",
  },
  {
    price: "EUR 214",
    airline: "Vueling",
    flightNumber: "VY 7824",
    departureTime: "13:40",
    arrivalTime: "16:15",
    duration: "2h 35m",
    stops: 0,
    stopoverLocation: "Direct",
  },
  {
    price: "EUR 249",
    airline: "Air Europa",
    flightNumber: "UX 1048",
    departureTime: "18:10",
    arrivalTime: "21:30",
    duration: "3h 20m",
    stops: 1,
    stopoverLocation: "Madrid",
  },
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

    return {
      price: getPrice(itineraryObject),
      airline: getAirline(leg),
      flightNumber: getFlightNumber(leg),
      departureTime: formatTime(leg.departure),
      arrivalTime: formatTime(leg.arrival),
      duration: formatDuration(leg.durationInMinutes),
      stops:
        typeof leg.stopCount === "number" || typeof leg.stopCount === "string"
          ? leg.stopCount
          : "Unknown",
      stopoverLocation: getStopoverLocation(leg),
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

function fallbackFlights(message: string) {
  return NextResponse.json({
    flights: MOCK_FLIGHTS,
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
    return fallbackFlights("Missing RAPIDAPI_KEY environment variable.");
  }

  const searchParams = new URLSearchParams({
    fromEntityId: origin.trim(),
    toEntityId: destination.trim(),
    date: date.trim(),
    adults: String(adultCount),
  });

  const requestUrl = `${SKYSCANNER_API_URL}?${searchParams}`;
  console.log("[search-flights] RapidAPI request", {
    url: requestUrl,
    params: Object.fromEntries(searchParams),
  });

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
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

      return fallbackFlights(message);
    }

    const flights = normalizeFlightOptions(payload);

    if (flights.length === 0) {
      console.error("[search-flights] RapidAPI returned no flight options", {
        payload,
      });

      return fallbackFlights("RapidAPI returned no flight options.");
    }

    return NextResponse.json({ flights });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected flight search error.";

    console.error("[search-flights] Request failed", error);

    return fallbackFlights(message);
  }
}

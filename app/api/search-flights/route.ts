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

type FlightOption = {
  price: string;
  airline: string;
  duration: string;
  stops: number | string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function formatDuration(minutes: unknown) {
  if (typeof minutes !== "number" || !Number.isFinite(minutes)) {
    return "Unknown";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function getPrice(itinerary: Record<string, unknown>) {
  const price = itinerary.price;

  if (typeof price === "string" || typeof price === "number") {
    return String(price);
  }

  if (price && typeof price === "object") {
    const priceObject = price as Record<string, unknown>;
    return String(
      priceObject.formatted ??
        priceObject.amount ??
        priceObject.raw ??
        priceObject.value ??
        "Unknown",
    );
  }

  return "Unknown";
}

function getFirstLeg(itinerary: Record<string, unknown>) {
  const legs = itinerary.legs;
  return Array.isArray(legs) && legs[0] && typeof legs[0] === "object"
    ? (legs[0] as Record<string, unknown>)
    : {};
}

function getAirline(leg: Record<string, unknown>) {
  const carriers = leg.carriers;

  if (carriers && typeof carriers === "object") {
    const carriersObject = carriers as Record<string, unknown>;
    const marketing = carriersObject.marketing;

    if (
      Array.isArray(marketing) &&
      marketing[0] &&
      typeof marketing[0] === "object"
    ) {
      const firstCarrier = marketing[0] as Record<string, unknown>;
      return String(firstCarrier.name ?? firstCarrier.alternateId ?? "Unknown");
    }
  }

  return "Unknown";
}

function normalizeFlightOptions(payload: unknown): FlightOption[] {
  const response = payload as Record<string, unknown>;
  const data = response.data as Record<string, unknown> | undefined;
  const itineraries =
    (Array.isArray(data?.itineraries) && data?.itineraries) ||
    (Array.isArray(response.itineraries) && response.itineraries) ||
    [];

  return itineraries
    .slice(0, 3)
    .map((itinerary): FlightOption => {
      const itineraryObject = itinerary as Record<string, unknown>;
      const leg = getFirstLeg(itineraryObject);

      return {
        price: getPrice(itineraryObject),
        airline: getAirline(leg),
        duration: formatDuration(leg.durationInMinutes),
        stops:
          typeof leg.stopCount === "number" || typeof leg.stopCount === "string"
            ? leg.stopCount
            : "Unknown",
      };
    });
}

export async function POST(request: Request) {
  const rapidApiKey = process.env.RAPIDAPI_KEY;

  if (!rapidApiKey) {
    return NextResponse.json(
      { error: "Missing RAPIDAPI_KEY environment variable." },
      { status: 500 },
    );
  }

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

  const searchParams = new URLSearchParams({
    fromId: origin.trim(),
    toId: destination.trim(),
    departDate: date.trim(),
    adults: String(adultCount),
  });

  const response = await fetch(`${SKYSCANNER_API_URL}?${searchParams}`, {
    method: "GET",
    headers: {
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": rapidApiKey,
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "Failed to search flights.",
        status: response.status,
        details: await response.text(),
      },
      { status: response.status },
    );
  }

  const payload = await response.json();

  return NextResponse.json({
    flights: normalizeFlightOptions(payload),
  });
}

import { NextResponse } from "next/server";

const BOOKING_DESTINATION_URL =
  "https://booking-com15.p.rapidapi.com/api/v1/hotels/searchDestination";
const BOOKING_HOTELS_URL =
  "https://booking-com15.p.rapidapi.com/api/v1/hotels/searchHotels";
const RAPIDAPI_HOST = "booking-com15.p.rapidapi.com";

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

function getOptionalString(...values: unknown[]) {
  const value = getStringValue(...values);
  return value === "Unknown" ? null : value;
}

function firstArray(...values: unknown[]) {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) {
      return value;
    }
  }

  return [];
}

function cleanDestinationName(value: string) {
  return (
    value
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\b(city|hotels?|hotel|accommodation|stay|stays)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim() || "the requested destination"
  );
}

function getDestinationItems(payload: unknown) {
  const response = asRecord(payload);
  const data = response.data;

  if (Array.isArray(data)) {
    return data;
  }

  const dataObject = asRecord(data);
  return firstArray(
    dataObject.destinations,
    dataObject.result,
    dataObject.results,
    response.destinations,
  );
}

function getDestinationName(destination: Record<string, unknown>) {
  return getStringValue(
    destination.name,
    destination.label,
    destination.city_name,
    destination.cityName,
    destination.region,
    destination.country,
  );
}

function destinationScore(
  destination: Record<string, unknown>,
  requestedDestination: string,
) {
  const requested = cleanDestinationName(requestedDestination).toLowerCase();
  const name = getDestinationName(destination).toLowerCase();

  if (name === requested) {
    return 3;
  }

  if (name.includes(requested)) {
    return 2;
  }

  if (requested.includes(name)) {
    return 1;
  }

  return 0;
}

function findDestination(
  payload: unknown,
  requestedDestination: string,
): { destId: string; searchType: string; name: string } | null {
  const destinations = getDestinationItems(payload);
  const validDestinations = destinations
    .map((item) => {
      const destination = asRecord(item);
      const destId = getOptionalString(
        destination.dest_id,
        destination.destId,
      );
      const searchType = getOptionalString(
        destination.search_type,
        destination.searchType,
        destination.dest_type,
        destination.destType,
      );

      if (!destId || !searchType) {
        return null;
      }

      return {
        destId,
        searchType,
        name: getDestinationName(destination),
        score: destinationScore(destination, requestedDestination),
      };
    })
    .filter((destination) => destination !== null)
    .sort((left, right) => right.score - left.score);

  const bestMatch = validDestinations[0];

  if (!bestMatch) {
    return null;
  }

  return {
    destId: bestMatch.destId,
    searchType: bestMatch.searchType,
    name: bestMatch.name,
  };
}

function countHotelsFromPayload(payload: unknown): number {
  const response = asRecord(payload);
  const data = asRecord(response.data);
  const hotels =
    (Array.isArray(data.hotels) && data.hotels) ||
    (Array.isArray(data.result) && data.result) ||
    (Array.isArray(data.results) && data.results) ||
    (Array.isArray(response.hotels) && response.hotels) ||
    [];
  return hotels.length;
}

export async function GET() {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  const rapidApiKeyPresent =
    typeof rapidApiKey === "string" && rapidApiKey.trim().length > 0;

  const key = rapidApiKey ?? "";

  try {
    const destinationParams = new URLSearchParams({ query: "Rome" });
    const destUrl = `${BOOKING_DESTINATION_URL}?${destinationParams}`;

    const destResponse = await fetch(destUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": key,
      },
    });

    const destText = await destResponse.text();

    if (!destResponse.ok) {
      return NextResponse.json({
        rapidApiKeyPresentInEnv: rapidApiKeyPresent,
        apiStatus: destResponse.status,
        hotelCount: null,
        rawBodyPreview: destText.slice(0, 500),
      });
    }

    let destPayload: unknown;
    try {
      destPayload = destText ? JSON.parse(destText) : {};
    } catch {
      return NextResponse.json({
        rapidApiKeyPresentInEnv: rapidApiKeyPresent,
        apiStatus: destResponse.status,
        hotelCount: null,
        rawBodyPreview: destText.slice(0, 500),
      });
    }

    const match = findDestination(destPayload, "Rome");

    if (!match) {
      return NextResponse.json({
        rapidApiKeyPresentInEnv: rapidApiKeyPresent,
        apiStatus: destResponse.status,
        hotelCount: null,
        rawBodyPreview: destText.slice(0, 500),
      });
    }

    const hotelParams = new URLSearchParams({
      dest_id: match.destId,
      search_type: match.searchType,
      arrival_date: "2026-09-15",
      departure_date: "2026-09-22",
      adults: "1",
      room_qty: "1",
    });

    const hotelsUrl = `${BOOKING_HOTELS_URL}?${hotelParams}`;

    const hotelsResponse = await fetch(hotelsUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": key,
      },
    });

    const hotelsText = await hotelsResponse.text();
    const rawBodyPreview = hotelsText.slice(0, 500);

    let hotelCount: number | null;
    try {
      const hotelsPayload = hotelsText ? JSON.parse(hotelsText) : {};
      hotelCount = hotelsResponse.ok ? countHotelsFromPayload(hotelsPayload) : null;
    } catch {
      hotelCount = null;
    }

    return NextResponse.json({
      rapidApiKeyPresentInEnv: rapidApiKeyPresent,
      apiStatus: hotelsResponse.status,
      hotelCount,
      rawBodyPreview,
    });
  } catch {
    return NextResponse.json({
      rapidApiKeyPresentInEnv: rapidApiKeyPresent,
      apiStatus: null,
      hotelCount: null,
      rawBodyPreview: "",
    });
  }
}

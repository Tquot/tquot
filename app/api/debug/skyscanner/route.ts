import { NextResponse } from "next/server";

const FLIGHTS_SKY_API_URL =
  "https://flights-sky.p.rapidapi.com/flights/search-one-way";
const FLIGHTS_SKY_RAPIDAPI_HOST = "flights-sky.p.rapidapi.com";
const FLIGHTS_SKY_MARKET = "ES";
const FLIGHTS_SKY_LOCALE = "en-GB";
const FLIGHTS_SKY_CURRENCY = "EUR";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function countFlightsFromPayload(payload: unknown): number {
  const response = asRecord(payload);
  const data = asRecord(response.data);
  const itineraries =
    (Array.isArray(data.itineraries) && data.itineraries) ||
    (Array.isArray(response.itineraries) && response.itineraries) ||
    [];
  return itineraries.length;
}

export async function GET() {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  const rapidApiKeyPresent =
    typeof rapidApiKey === "string" && rapidApiKey.trim().length > 0;

  const searchParams = new URLSearchParams({
    fromEntityId: "MAD",
    toEntityId: "FCO",
    departDate: "2026-09-15",
    adults: "1",
    market: FLIGHTS_SKY_MARKET,
    locale: FLIGHTS_SKY_LOCALE,
    currency: FLIGHTS_SKY_CURRENCY,
  });

  const requestUrl = `${FLIGHTS_SKY_API_URL}?${searchParams}`;

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-host": FLIGHTS_SKY_RAPIDAPI_HOST,
        "x-rapidapi-key": rapidApiKey ?? "",
      },
    });

    const responseText = await response.text();
    const rawBodyPreview = responseText.slice(0, 500);

    let flightCount: number | null;
    try {
      const payload = responseText ? JSON.parse(responseText) : {};
      flightCount = countFlightsFromPayload(payload);
    } catch {
      flightCount = null;
    }

    return NextResponse.json({
      rapidApiKeyPresentInEnv: rapidApiKeyPresent,
      apiStatus: response.status,
      flightCount,
      rawBodyPreview,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json({
      rapidApiKeyPresentInEnv: rapidApiKeyPresent,
      apiStatus: null,
      flightCount: null,
      rawBodyPreview: "",
      fetchError: message,
    });
  }
}
 

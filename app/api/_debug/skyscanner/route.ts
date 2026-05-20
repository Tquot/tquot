import { NextResponse } from "next/server";

const SKYSCANNER_API_URL =
  "https://skyscanner80.p.rapidapi.com/api/v1/flights/search-one-way";
const RAPIDAPI_HOST = "skyscanner80.p.rapidapi.com";
const SKYSCANNER_MARKET = "ES";
const SKYSCANNER_LOCALE = "en-GB";
const SKYSCANNER_CURRENCY = "EUR";

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
    date: "2026-09-15",
    adults: "1",
    market: SKYSCANNER_MARKET,
    locale: SKYSCANNER_LOCALE,
    currency: SKYSCANNER_CURRENCY,
  });

  const requestUrl = `${SKYSCANNER_API_URL}?${searchParams}`;

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
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

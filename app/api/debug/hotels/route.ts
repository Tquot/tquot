import { NextResponse } from "next/server";

const BOOKING_AUTOCOMPLETE_URL =
  "https://booking-com18.p.rapidapi.com/stays/auto-complete";
const BOOKING_SEARCH_URL = "https://booking-com18.p.rapidapi.com/stays/search";
const RAPIDAPI_HOST = "booking-com18.p.rapidapi.com";

const RAW_BODY_PREVIEW_LENGTH = 3000;

function getTopLevelResponseKeys(payload: unknown): string[] {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return Object.keys(payload as Record<string, unknown>);
  }

  return [];
}

function parseJsonSafe(text: string): unknown | null {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
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

function getAutocompleteItems(payload: unknown) {
  const response = asRecord(payload);
  const data = response.data;

  if (Array.isArray(data)) {
    return data;
  }

  const dataObject = asRecord(data);
  return firstArray(
    dataObject.results,
    dataObject.result,
    dataObject.destinations,
    dataObject.suggestions,
    response.results,
    response.destinations,
  );
}

function getDestinationName(destination: Record<string, unknown>) {
  return getStringValue(
    destination.label,
    destination.name,
    destination.city_name,
    destination.cityName,
    destination.region,
    destination.country,
    destination.display_name,
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

function getAutocompleteData(payload: unknown): Record<string, unknown>[] {
  const response = asRecord(payload);
  const data = response.data;

  if (Array.isArray(data)) {
    return data.map(asRecord);
  }

  return getAutocompleteItems(payload).map(asRecord);
}

function isCityResult(item: Record<string, unknown>) {
  const type = getStringValue(item.type, item.dest_type, item.locationType).toLowerCase();
  return type === "city";
}

function getLocationIdFromItem(item: Record<string, unknown>) {
  return getOptionalString(item.id, item.locationId, item.dest_id, item.destId);
}

function findLocationId(
  payload: unknown,
  requestedDestination: string,
): { locationId: string; name: string } | null {
  const items = getAutocompleteData(payload);

  const firstItem = items[0];
  if (firstItem) {
    const locationId = getLocationIdFromItem(firstItem);
    if (locationId) {
      return {
        locationId,
        name: getDestinationName(firstItem),
      };
    }
  }

  const cityItem = items.find(isCityResult);
  if (cityItem) {
    const locationId = getLocationIdFromItem(cityItem);
    if (locationId) {
      return {
        locationId,
        name: getDestinationName(cityItem),
      };
    }
  }

  const scored = items
    .map((item) => {
      const locationId = getLocationIdFromItem(item);
      if (!locationId) {
        return null;
      }

      return {
        locationId,
        name: getDestinationName(item),
        score: destinationScore(item, requestedDestination),
      };
    })
    .filter((item) => item !== null)
    .sort((left, right) => right.score - left.score);

  const bestMatch = scored[0];
  if (!bestMatch) {
    return null;
  }

  return {
    locationId: bestMatch.locationId,
    name: bestMatch.name,
  };
}

function getHotelItems(payload: unknown): unknown[] {
  const response = asRecord(payload);
  const data = asRecord(response.data);

  return firstArray(
    data.hotels,
    data.result,
    data.results,
    data.properties,
    response.hotels,
    response.results,
  );
}

function getFirstHotelRaw(payload: unknown): unknown | null {
  const hotels = getHotelItems(payload);
  return hotels.length > 0 ? hotels[0] : null;
}

function countHotelsFromPayload(payload: unknown): number {
  return getHotelItems(payload).length;
}

export async function GET() {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  const rapidApiKeyPresent =
    typeof rapidApiKey === "string" && rapidApiKey.trim().length > 0;

  const key = rapidApiKey ?? "";

  try {
    const autocompleteParams = new URLSearchParams({ query: "Rome" });
    const autocompleteUrl = `${BOOKING_AUTOCOMPLETE_URL}?${autocompleteParams}`;

    const autocompleteResponse = await fetch(autocompleteUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": key,
      },
    });

    const autocompleteText = await autocompleteResponse.text();

    if (!autocompleteResponse.ok) {
      const autocompletePayload = parseJsonSafe(autocompleteText);
      return NextResponse.json({
        rapidApiKeyPresentInEnv: rapidApiKeyPresent,
        apiStatus: autocompleteResponse.status,
        hotelCount: null,
        rawBodyPreview: autocompleteText.slice(0, RAW_BODY_PREVIEW_LENGTH),
        responseKeys: getTopLevelResponseKeys(autocompletePayload),
        firstHotelRaw: null,
      });
    }

    const autocompletePayload = parseJsonSafe(autocompleteText);

    if (autocompletePayload === null) {
      return NextResponse.json({
        rapidApiKeyPresentInEnv: rapidApiKeyPresent,
        apiStatus: autocompleteResponse.status,
        hotelCount: null,
        rawBodyPreview: autocompleteText.slice(0, RAW_BODY_PREVIEW_LENGTH),
        responseKeys: [],
        firstHotelRaw: null,
      });
    }

    const match = findLocationId(autocompletePayload, "Rome");

    if (!match) {
      return NextResponse.json({
        rapidApiKeyPresentInEnv: rapidApiKeyPresent,
        apiStatus: autocompleteResponse.status,
        hotelCount: null,
        rawBodyPreview: autocompleteText.slice(0, RAW_BODY_PREVIEW_LENGTH),
        responseKeys: getTopLevelResponseKeys(autocompletePayload),
        firstHotelRaw: null,
      });
    }

    const hotelParams = new URLSearchParams({
      locationId: match.locationId,
      checkinDate: "2026-09-15",
      checkoutDate: "2026-09-22",
      adults: "1",
      rooms: "1",
      sortBy: "popularity",
      languageCode: "es",
      currencyCode: "EUR",
      units: "metric",
      temperature: "c",
    });

    const hotelsUrl = `${BOOKING_SEARCH_URL}?${hotelParams}`;

    const hotelsResponse = await fetch(hotelsUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": key,
      },
    });

    const hotelsText = await hotelsResponse.text();
    const rawBodyPreview = hotelsText.slice(0, RAW_BODY_PREVIEW_LENGTH);

    const hotelsPayload = parseJsonSafe(hotelsText);
    const hotelCount =
      hotelsPayload !== null && hotelsResponse.ok
        ? countHotelsFromPayload(hotelsPayload)
        : null;
    const firstHotelRaw =
      hotelsPayload !== null ? getFirstHotelRaw(hotelsPayload) : null;

    return NextResponse.json({
      rapidApiKeyPresentInEnv: rapidApiKeyPresent,
      apiStatus: hotelsResponse.status,
      hotelCount,
      rawBodyPreview,
      responseKeys: getTopLevelResponseKeys(hotelsPayload),
      firstHotelRaw,
    });
  } catch {
    return NextResponse.json({
      rapidApiKeyPresentInEnv: rapidApiKeyPresent,
      apiStatus: null,
      hotelCount: null,
      rawBodyPreview: "",
      responseKeys: [],
      firstHotelRaw: null,
    });
  }
}

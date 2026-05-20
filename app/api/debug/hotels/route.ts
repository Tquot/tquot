import { NextResponse } from "next/server";

const HOTELS_COM_REGIONS_URL =
  "https://hotels-com-provider.p.rapidapi.com/v2/regions";
const HOTELS_COM_SEARCH_URL =
  "https://hotels-com-provider.p.rapidapi.com/v2/hotels/search";
const RAPIDAPI_HOST = "hotels-com-provider.p.rapidapi.com";
const HOTELS_COM_LOCALE = "es_ES";
const HOTELS_COM_DOMAIN = "ES";
const HOTELS_COM_SORT_ORDER = "REVIEW";

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

function getRegionItems(payload: unknown) {
  const response = asRecord(payload);
  const data = response.data;

  if (Array.isArray(data)) {
    return data;
  }

  const dataObject = asRecord(data);
  return firstArray(
    dataObject.regions,
    dataObject.results,
    dataObject.result,
    response.regions,
  );
}

function getRegionName(region: Record<string, unknown>) {
  return getStringValue(
    region.name,
    region.fullName,
    region.label,
    region.shortName,
    region.regionName,
    region.city,
    region.locality,
  );
}

function regionScore(region: Record<string, unknown>, requestedDestination: string) {
  const requested = cleanDestinationName(requestedDestination).toLowerCase();
  const name = getRegionName(region).toLowerCase();

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

function findRegion(
  payload: unknown,
  requestedDestination: string,
): { regionId: string; name: string } | null {
  const regions = getRegionItems(payload);
  const validRegions = regions
    .map((item) => {
      const region = asRecord(item);
      const regionId = getOptionalString(
        region.region_id,
        region.regionId,
        region.gaiaId,
        region.id,
      );

      if (!regionId) {
        return null;
      }

      return {
        regionId,
        name: getRegionName(region),
        score: regionScore(region, requestedDestination),
      };
    })
    .filter((region) => region !== null)
    .sort((left, right) => right.score - left.score);

  const bestMatch = validRegions[0];

  if (!bestMatch) {
    return null;
  }

  return {
    regionId: bestMatch.regionId,
    name: bestMatch.name,
  };
}

function getHotelItems(payload: unknown): unknown[] {
  const response = asRecord(payload);
  const data = asRecord(response.data);
  const propertySearchResults = asRecord(
    response.propertySearchResults ?? response.PropertySearchResults,
  );
  const dataPropertySearchResults = asRecord(
    data.propertySearchResults ?? data.PropertySearchResults,
  );

  return firstArray(
    response.properties,
    propertySearchResults.properties,
    dataPropertySearchResults.properties,
    data.properties,
    response.results,
    data.results,
  );
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
    const regionParams = new URLSearchParams({
      locale: HOTELS_COM_LOCALE,
      domain: HOTELS_COM_DOMAIN,
      query: "Rome",
    });
    const regionUrl = `${HOTELS_COM_REGIONS_URL}?${regionParams}`;

    const regionResponse = await fetch(regionUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": key,
      },
    });

    const regionText = await regionResponse.text();

    if (!regionResponse.ok) {
      const regionPayload = parseJsonSafe(regionText);
      return NextResponse.json({
        rapidApiKeyPresentInEnv: rapidApiKeyPresent,
        apiStatus: regionResponse.status,
        hotelCount: null,
        rawBodyPreview: regionText.slice(0, RAW_BODY_PREVIEW_LENGTH),
        responseKeys: getTopLevelResponseKeys(regionPayload),
      });
    }

    const regionPayload = parseJsonSafe(regionText);

    if (regionPayload === null) {
      return NextResponse.json({
        rapidApiKeyPresentInEnv: rapidApiKeyPresent,
        apiStatus: regionResponse.status,
        hotelCount: null,
        rawBodyPreview: regionText.slice(0, RAW_BODY_PREVIEW_LENGTH),
        responseKeys: [],
      });
    }

    const match = findRegion(regionPayload, "Rome");

    if (!match) {
      return NextResponse.json({
        rapidApiKeyPresentInEnv: rapidApiKeyPresent,
        apiStatus: regionResponse.status,
        hotelCount: null,
        rawBodyPreview: regionText.slice(0, RAW_BODY_PREVIEW_LENGTH),
        responseKeys: getTopLevelResponseKeys(regionPayload),
      });
    }

    const hotelParams = new URLSearchParams({
      region_id: match.regionId,
      checkin_date: "2026-09-15",
      checkout_date: "2026-09-22",
      adults_number: "1",
      locale: HOTELS_COM_LOCALE,
      domain: HOTELS_COM_DOMAIN,
      sort_order: HOTELS_COM_SORT_ORDER,
    });

    const hotelsUrl = `${HOTELS_COM_SEARCH_URL}?${hotelParams}`;

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

    return NextResponse.json({
      rapidApiKeyPresentInEnv: rapidApiKeyPresent,
      apiStatus: hotelsResponse.status,
      hotelCount,
      rawBodyPreview,
      responseKeys: getTopLevelResponseKeys(hotelsPayload),
    });
  } catch {
    return NextResponse.json({
      rapidApiKeyPresentInEnv: rapidApiKeyPresent,
      apiStatus: null,
      hotelCount: null,
      rawBodyPreview: "",
      responseKeys: [],
    });
  }
}

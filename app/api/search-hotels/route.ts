import { NextResponse } from "next/server";
import type { HotelLevel } from "@/lib/quotes/build-quote";
import { passesApiHotelLevelFilter } from "@/lib/quotes/hotel-level-filter";

const BOOKING_AUTOCOMPLETE_URL =
  "https://booking-com18.p.rapidapi.com/stays/auto-complete";
const BOOKING_SEARCH_URL = "https://booking-com18.p.rapidapi.com/stays/search";
const RAPIDAPI_HOST = "booking-com18.p.rapidapi.com";

type SearchHotelsRequest = {
  destination?: unknown;
  checkIn?: unknown;
  checkOut?: unknown;
  adults?: unknown;
  hotelLevel?: unknown;
  rapidapiKey?: unknown;
  propertyIds?: unknown;
};

const HOTEL_LEVELS = new Set<HotelLevel>([
  "budget",
  "standard",
  "premium",
  "luxury",
]);

function parseHotelLevel(value: unknown): HotelLevel | undefined {
  if (typeof value !== "string") return undefined;
  const level = value.trim().toLowerCase() as HotelLevel;
  return HOTEL_LEVELS.has(level) ? level : undefined;
}

export type HotelOption = {
  name: string;
  pricePerNight: string;
  stars: number | string;
  rating: number | string;
  address: string;
  roomType: string;
  highlights: string[];
  distanceFromCenter: string;
  providerName?: string;
  hotelCode?: string;
  propertyId?: string;
  connectionId?: string;
};

type LocationMatch = {
  locationId: string;
  name: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

function cleanPrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${Math.round(value)} EUR`;
  }

  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  const numberMatch = normalized.match(/\d+(?:[.,]\d+)?/);

  if (!numberMatch) {
    return "";
  }

  const amount = Math.round(Number(numberMatch[0].replace(",", ".")));

  if (!Number.isFinite(amount)) {
    return "";
  }

  return `${amount} EUR`;
}

function firstArray(...values: unknown[]) {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) {
      return value;
    }
  }

  return [];
}

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
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
): LocationMatch | null {
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

function countNights(checkIn: string, checkOut: string) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1;
  }

  const diffMs = end.getTime() - start.getTime();
  const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return nights > 0 ? nights : 1;
}

function getHotelItems(payload: unknown): unknown[] {
  const response = asRecord(payload);
  const data = response.data;

  if (Array.isArray(data) && data.length > 0) {
    return data;
  }

  const dataObject = asRecord(data);
  return firstArray(
    dataObject.hotels,
    dataObject.result,
    dataObject.results,
    response.hotels,
    response.results,
  );
}

function getHotelName(hotel: Record<string, unknown>) {
  return getStringValue(hotel.name);
}

function getPropertyId(hotel: Record<string, unknown>): string | undefined {
  const property = asRecord(hotel.property);
  return (
    getOptionalString(
      hotel.hotel_id,
      hotel.hotelId,
      hotel.property_id,
      hotel.propertyId,
      property.id,
      hotel.id,
    ) ?? undefined
  );
}

function getPricePerNight(hotel: Record<string, unknown>, nights: number) {
  const priceBreakdown = asRecord(hotel.priceBreakdown);
  const grossPrice = asRecord(priceBreakdown.grossPrice);
  const totalValue = grossPrice.value;

  if (typeof totalValue === "number" && Number.isFinite(totalValue) && nights > 0) {
    return `${Math.round(totalValue / nights)} EUR`;
  }

  const formatted = cleanPrice(grossPrice.amountRounded);
  if (formatted) {
    return formatted;
  }

  return cleanPrice(totalValue) || "Unknown";
}

function getStars(hotel: Record<string, unknown>) {
  return getStringValue(hotel.qualityClass, hotel.accuratePropertyClass);
}

function getRating(hotel: Record<string, unknown>) {
  return getStringValue(hotel.reviewScore);
}

function getAddress(hotel: Record<string, unknown>) {
  const property = asRecord(hotel.property);
  const location = asRecord(hotel.location ?? property.location);

  return getStringValue(
    hotel.address,
    property.address,
    hotel.address_trans,
    property.address_trans,
    location.address,
    location.city,
    hotel.city,
    property.city,
  );
}

function getRoomType(hotel: Record<string, unknown>) {
  const property = asRecord(hotel.property);
  const blocks = firstArray(hotel.block, hotel.rooms, property.rooms);
  const firstRoom = asRecord(blocks[0]);

  return getStringValue(
    hotel.roomType,
    hotel.room_name,
    hotel.roomName,
    firstRoom.name,
    firstRoom.room_name,
    property.roomType,
    "Habitación doble",
  );
}

function getDistanceFromCenter(hotel: Record<string, unknown>) {
  const property = asRecord(hotel.property);

  return getStringValue(
    hotel.distanceFromCenter,
    hotel.distance_to_cc,
    hotel.distance,
    property.distanceFromCenter,
    property.distance_to_cc,
    property.distance,
    "Distance unavailable",
  );
}

function getHighlights(hotel: Record<string, unknown>) {
  const property = asRecord(hotel.property);
  const badges = firstArray(
    hotel.badges,
    hotel.facilities,
    hotel.highlights,
    property.badges,
    property.facilities,
    property.highlights,
  );

  const parsed = badges
    .map((badge) => {
      const badgeObject = asRecord(badge);
      return getStringValue(
        badgeObject.text,
        badgeObject.name,
        badgeObject.title,
        badge,
      );
    })
    .filter((highlight) => highlight !== "Unknown")
    .slice(0, 3);

  if (parsed.length > 0) {
    return parsed;
  }

  return ["Centro ciudad", "Wifi gratis", "Buena ubicación"];
}

function normalizeHotelOptions(
  payload: unknown,
  nights: number,
): HotelOption[] {
  const hotels = getHotelItems(payload);

  return hotels.slice(0, 3).map((hotel): HotelOption => {
    const hotelObject = asRecord(hotel);
    const propertyId = getPropertyId(hotelObject);

    return {
      name: getHotelName(hotelObject),
      pricePerNight: getPricePerNight(hotelObject, nights),
      stars: getStars(hotelObject),
      rating: getRating(hotelObject),
      address: getAddress(hotelObject),
      roomType: getRoomType(hotelObject),
      highlights: getHighlights(hotelObject),
      distanceFromCenter: getDistanceFromCenter(hotelObject),
      ...(propertyId ? { propertyId } : {}),
    };
  });
}

function createMockHotels(
  destination: string,
  hotelLevel: HotelLevel = "standard",
): HotelOption[] {
  const city = cleanDestinationName(destination);

  console.log("[search-hotels] Creating fallback mock hotels", { city, hotelLevel });

  const tiers: Record<
    HotelLevel,
    Array<{ suffix: string; stars: number; price: string }>
  > = {
    budget: [
      { suffix: "City Inn", stars: 3, price: "EUR 89" },
      { suffix: "Travel Lodge", stars: 3, price: "EUR 95" },
      { suffix: "Metro Stay", stars: 2, price: "EUR 79" },
    ],
    standard: [
      { suffix: "Grand Central Hotel", stars: 4, price: "EUR 145" },
      { suffix: "Aurora Boutique Suites", stars: 4, price: "EUR 178" },
      { suffix: "Metropolitan Business Hotel", stars: 3, price: "EUR 121" },
    ],
    premium: [
      { suffix: "Premium Collection", stars: 4, price: "EUR 195" },
      { suffix: "Harbour View", stars: 5, price: "EUR 220" },
      { suffix: "Executive Suites", stars: 4, price: "EUR 210" },
    ],
    luxury: [
      { suffix: "Grand Luxury Resort", stars: 5, price: "EUR 320" },
      { suffix: "Palace & Spa", stars: 5, price: "EUR 380" },
      { suffix: "Signature Collection", stars: 5, price: "EUR 295" },
    ],
  };

  return tiers[hotelLevel].map((tier, index) => ({
    name: `${city} ${tier.suffix}`,
    pricePerNight: tier.price,
    stars: tier.stars,
    rating: 8.5 + index * 0.2,
    address: `${city} — opción ${index + 1}`,
    roomType: index === 2 ? "Suite" : "Habitación doble",
    highlights: ["Buena ubicación", "Wifi gratis", "Cancelación flexible"],
    distanceFromCenter: `${0.4 + index * 0.3} km from centre`,
  }));
}

function filterHotelsByLevel(
  hotels: HotelOption[],
  hotelLevel?: HotelLevel,
): HotelOption[] {
  if (!hotelLevel) return hotels;
  return hotels.filter((hotel) =>
    passesApiHotelLevelFilter(hotel.stars, hotelLevel),
  );
}

function filterHotelsByPropertyIds(
  hotels: HotelOption[],
  propertyIds?: string[],
): HotelOption[] {
  if (!propertyIds?.length) {
    return hotels;
  }
  const idSet = new Set(propertyIds.map(String));
  return hotels.filter(
    (hotel) => hotel.propertyId !== undefined && idSet.has(String(hotel.propertyId)),
  );
}

function fallbackHotels(
  message: string,
  destination: string,
  hotelLevel?: HotelLevel,
) {
  return NextResponse.json({
    hotels: createMockHotels(destination, hotelLevel ?? "standard"),
    fallback: true,
    error: message,
  });
}

async function rapidApiGet(url: string, rapidApiKey: string, label: string) {
  console.log(`[search-hotels] ${label} request`, { url });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": rapidApiKey,
    },
  });

  const responseText = await response.text();
  console.log(`[search-hotels] ${label} response`, {
    status: response.status,
    ok: response.ok,
    body: responseText,
  });

  const payload = parseJson(responseText);

  if (!response.ok) {
    const message = getErrorMessage(
      payload,
      responseText || `${label} request failed.`,
    );

    console.error(`[search-hotels] ${label} RapidAPI error`, {
      status: response.status,
      message,
      payload,
    });

    throw new Error(message);
  }

  return payload;
}

export async function POST(request: Request) {
  let body: SearchHotelsRequest;

  try {
    body = (await request.json()) as SearchHotelsRequest;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const rapidapiKeyFromBody = isNonEmptyString(body.rapidapiKey)
    ? body.rapidapiKey.trim()
    : undefined;
  const rapidApiKey = rapidapiKeyFromBody ?? process.env.RAPIDAPI_KEY;

  const propertyIds = Array.isArray(body.propertyIds)
    ? body.propertyIds
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim())
    : undefined;

  const { destination, checkIn, checkOut, adults, hotelLevel: hotelLevelRaw } =
    body;
  const hotelLevel = parseHotelLevel(hotelLevelRaw);

  if (
    !isNonEmptyString(destination) ||
    !isNonEmptyString(checkIn) ||
    !isNonEmptyString(checkOut)
  ) {
    return NextResponse.json(
      { error: "destination, checkIn and checkOut are required." },
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
    console.error("[search-hotels] Missing RAPIDAPI_KEY; returning fallback.");
    return fallbackHotels(
      "Missing RAPIDAPI_KEY environment variable.",
      destination,
      hotelLevel,
    );
  }

  try {
    const autocompleteParams = new URLSearchParams({
      query: destination.trim(),
    });
    const destinationPayload = await rapidApiGet(
      `${BOOKING_AUTOCOMPLETE_URL}?${autocompleteParams}`,
      rapidApiKey,
      "autoComplete",
    );
    const locationMatch = findLocationId(destinationPayload, destination);

    if (!locationMatch) {
      console.error("[search-hotels] No location match found", {
        destination,
        payload: destinationPayload,
      });

      return fallbackHotels(
        "Booking.com returned no location match.",
        destination,
        hotelLevel,
      );
    }

    console.log("[search-hotels] Selected Booking.com location", {
      requestedDestination: destination,
      locationId: locationMatch.locationId,
      matchedName: locationMatch.name,
    });

    const hotelParams = new URLSearchParams({
      locationId: locationMatch.locationId,
      checkinDate: checkIn.trim(),
      checkoutDate: checkOut.trim(),
      adults: String(adultCount),
      rooms: "1",
      sortBy: "popularity",
      languageCode: "es",
      currencyCode: "EUR",
      units: "metric",
      temperature: "c",
    });
    const hotelPayload = await rapidApiGet(
      `${BOOKING_SEARCH_URL}?${hotelParams}`,
      rapidApiKey,
      "searchStays",
    );
    const nights = countNights(checkIn.trim(), checkOut.trim());
    let hotels = filterHotelsByLevel(
      normalizeHotelOptions(hotelPayload, nights),
      hotelLevel,
    );
    hotels = filterHotelsByPropertyIds(hotels, propertyIds);

    if (hotels.length === 0) {
      console.error("[search-hotels] RapidAPI returned no hotel options", {
        payload: hotelPayload,
        hotelLevel,
        propertyIds,
      });

      return fallbackHotels(
        "RapidAPI returned no hotel options after level filter.",
        destination,
        hotelLevel,
      );
    }

    return NextResponse.json({ hotels });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected hotel search error.";

    console.error("[search-hotels] Request failed", error);

    return fallbackHotels(message, destination, hotelLevel);
  }
}

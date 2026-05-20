import { NextResponse } from "next/server";

const HOTELS_COM_REGIONS_URL =
  "https://hotels-com-provider.p.rapidapi.com/v2/regions";
const HOTELS_COM_SEARCH_URL =
  "https://hotels-com-provider.p.rapidapi.com/v2/hotels/search";
const RAPIDAPI_HOST = "hotels-com-provider.p.rapidapi.com";
const HOTELS_COM_LOCALE = "es_ES";
const HOTELS_COM_DOMAIN = "ES";
const HOTELS_COM_SORT_ORDER = "REVIEW";

type SearchHotelsRequest = {
  destination?: unknown;
  checkIn?: unknown;
  checkOut?: unknown;
  adults?: unknown;
};

export type HotelOption = {
  name: string;
  pricePerNight: string;
  stars: number | string;
  rating: number | string;
  address: string;
  roomType: string;
  highlights: string[];
  distanceFromCenter: string;
};

type RegionMatch = {
  regionId: string;
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
): RegionMatch | null {
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
    response.propertySearchListings,
    data.properties,
    data.propertySearchListings,
    propertySearchResults.properties,
    dataPropertySearchResults.properties,
    response.results,
    data.results,
  );
}

function getPricePerNight(hotel: Record<string, unknown>) {
  const price = asRecord(hotel.price);
  const lead = asRecord(price.lead);
  const ratePlan = asRecord(hotel.ratePlan);
  const ratePlanPrice = asRecord(ratePlan.price);
  const rooms = firstArray(hotel.rooms);
  const firstRoom = asRecord(rooms[0]);
  const roomRatePlans = firstArray(firstRoom.ratePlans);
  const firstRatePlan = asRecord(roomRatePlans[0]);
  const roomPrice = asRecord(firstRatePlan.price);

  const candidates = [
    lead.formatted,
    lead.amount,
    price.formatted,
    price.current,
    price.amount,
    ratePlanPrice.current,
    ratePlanPrice.formatted,
    roomPrice.current,
    roomPrice.formatted,
    hotel.pricePerNight,
    hotel.nightly,
  ];

  for (const candidate of candidates) {
    const parsed = cleanPrice(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return "Unknown";
}

function getStars(hotel: Record<string, unknown>) {
  return getStringValue(
    hotel.stars,
    hotel.starRating,
    hotel.star,
    hotel.propertyClass,
    hotel.hotelClass,
  );
}

function getRating(hotel: Record<string, unknown>) {
  const reviews = asRecord(hotel.reviews);
  const guestReviews = asRecord(hotel.guestReviews);
  const reviewScore = asRecord(hotel.reviewScore);

  return getStringValue(
    hotel.rating,
    reviews.score,
    reviews.overall,
    guestReviews.rating,
    guestReviews.overall,
    reviewScore.score,
    reviewScore.overall,
  );
}

function getAddress(hotel: Record<string, unknown>) {
  const address = asRecord(hotel.address);
  const neighborhood = asRecord(hotel.neighborhood);
  const mapMarker = asRecord(hotel.mapMarker);
  const location = asRecord(hotel.location);

  const street = getOptionalString(
    address.streetAddress,
    address.lineOne,
    address.line1,
    location.address,
    mapMarker.label,
  );
  const locality = getOptionalString(
    address.locality,
    address.city,
    neighborhood.name,
    location.city,
  );

  if (street && locality) {
    return `${street}, ${locality}`;
  }

  return getStringValue(
    hotel.address,
    street,
    locality,
    neighborhood.name,
    mapMarker.label,
  );
}

function getRoomType(hotel: Record<string, unknown>) {
  const rooms = firstArray(hotel.rooms);
  const firstRoom = asRecord(rooms[0]);
  const ratePlans = firstArray(firstRoom.ratePlans);
  const firstRatePlan = asRecord(ratePlans[0]);

  return getStringValue(
    hotel.roomType,
    firstRoom.name,
    firstRoom.description,
    firstRatePlan.name,
    firstRatePlan.description,
    "Habitación doble",
  );
}

function getDistanceFromCenter(hotel: Record<string, unknown>) {
  const neighborhood = asRecord(hotel.neighborhood);
  const destinationInfo = asRecord(hotel.destinationInfo);

  return getStringValue(
    hotel.distanceFromCenter,
    hotel.distance,
    neighborhood.distance,
    destinationInfo.distanceFromDestination,
    destinationInfo.distanceFromCenter,
    "Distance unavailable",
  );
}

function getHighlights(hotel: Record<string, unknown>) {
  const amenities = firstArray(
    hotel.amenities,
    hotel.features,
    hotel.highlights,
    hotel.propertyAmenities,
  );

  const parsed = amenities
    .map((item) => {
      const amenity = asRecord(item);
      return getStringValue(
        amenity.text,
        amenity.name,
        amenity.title,
        amenity.label,
        item,
      );
    })
    .filter((highlight) => highlight !== "Unknown")
    .slice(0, 3);

  if (parsed.length > 0) {
    return parsed;
  }

  return ["Centro ciudad", "Wifi gratis", "Buena ubicación"];
}

function normalizeHotelOptions(payload: unknown): HotelOption[] {
  const hotels = getHotelItems(payload);

  return hotels.slice(0, 3).map((hotel): HotelOption => {
    const hotelObject = asRecord(hotel);

    return {
      name: getStringValue(
        hotelObject.name,
        hotelObject.hotelName,
        hotelObject.title,
        asRecord(hotelObject.headingSection).title,
      ),
      pricePerNight: getPricePerNight(hotelObject),
      stars: getStars(hotelObject),
      rating: getRating(hotelObject),
      address: getAddress(hotelObject),
      roomType: getRoomType(hotelObject),
      highlights: getHighlights(hotelObject),
      distanceFromCenter: getDistanceFromCenter(hotelObject),
    };
  });
}

function createMockHotels(destination: string): HotelOption[] {
  const city = cleanDestinationName(destination);

  console.log("[search-hotels] Creating fallback mock hotels", { city });

  return [
    {
      name: `${city} Grand Central Hotel`,
      pricePerNight: "EUR 145",
      stars: 4,
      rating: 8.7,
      address: `${city} city centre, close to the main attractions`,
      roomType: "Habitación doble",
      highlights: ["Centro ciudad", "Desayuno incluido", "Wifi gratis"],
      distanceFromCenter: "0.4 km from centre",
    },
    {
      name: `${city} Aurora Boutique Suites`,
      pricePerNight: "EUR 178",
      stars: 4,
      rating: 9.1,
      address: `${city} historic district, near restaurants and shops`,
      roomType: "Suite",
      highlights: ["Piscina", "Terraza", "Cerca del casco antiguo"],
      distanceFromCenter: "0.8 km from centre",
    },
    {
      name: `${city} Metropolitan Business Hotel`,
      pricePerNight: "EUR 121",
      stars: 3,
      rating: 8.3,
      address: `${city} central station area`,
      roomType: "Habitación estándar",
      highlights: ["Estación central", "Recepción 24h", "Cancelación flexible"],
      distanceFromCenter: "1.2 km from centre",
    },
  ];
}

function fallbackHotels(message: string, destination: string) {
  return NextResponse.json({
    hotels: createMockHotels(destination),
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
  const rapidApiKey = process.env.RAPIDAPI_KEY;

  let body: SearchHotelsRequest;

  try {
    body = (await request.json()) as SearchHotelsRequest;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const { destination, checkIn, checkOut, adults } = body;

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
    );
  }

  try {
    const regionParams = new URLSearchParams({
      locale: HOTELS_COM_LOCALE,
      domain: HOTELS_COM_DOMAIN,
      query: destination.trim(),
    });
    const regionPayload = await rapidApiGet(
      `${HOTELS_COM_REGIONS_URL}?${regionParams}`,
      rapidApiKey,
      "searchRegions",
    );
    const regionMatch = findRegion(regionPayload, destination);

    if (!regionMatch) {
      console.error("[search-hotels] No region match found", {
        destination,
        payload: regionPayload,
      });

      return fallbackHotels("Hotels.com returned no region match.", destination);
    }

    console.log("[search-hotels] Selected Hotels.com region", {
      requestedDestination: destination,
      regionId: regionMatch.regionId,
      matchedName: regionMatch.name,
    });

    const hotelParams = new URLSearchParams({
      region_id: regionMatch.regionId,
      checkin_date: checkIn.trim(),
      checkout_date: checkOut.trim(),
      adults_number: String(adultCount),
      locale: HOTELS_COM_LOCALE,
      domain: HOTELS_COM_DOMAIN,
      sort_order: HOTELS_COM_SORT_ORDER,
    });
    const hotelPayload = await rapidApiGet(
      `${HOTELS_COM_SEARCH_URL}?${hotelParams}`,
      rapidApiKey,
      "searchHotels",
    );
    const hotels = normalizeHotelOptions(hotelPayload);

    if (hotels.length === 0) {
      console.error("[search-hotels] RapidAPI returned no hotel options", {
        payload: hotelPayload,
      });

      return fallbackHotels("RapidAPI returned no hotel options.", destination);
    }

    return NextResponse.json({ hotels });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected hotel search error.";

    console.error("[search-hotels] Request failed", error);

    return fallbackHotels(message, destination);
  }
}

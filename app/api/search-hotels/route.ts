import { NextResponse } from "next/server";

const BOOKING_DESTINATION_URL =
  "https://booking-com15.p.rapidapi.com/api/v1/hotels/searchDestination";
const BOOKING_HOTELS_URL =
  "https://booking-com15.p.rapidapi.com/api/v1/hotels/searchHotels";
const RAPIDAPI_HOST = "booking-com15.p.rapidapi.com";

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
};

type DestinationMatch = {
  destId: string;
  searchType: string;
};

const MOCK_HOTELS: HotelOption[] = [
  {
    name: "TQuot Grand Central Hotel",
    pricePerNight: "EUR 145",
    stars: 4,
    rating: 8.7,
    address: "City centre, close to the main attractions",
  },
  {
    name: "Aurora Boutique Suites",
    pricePerNight: "EUR 178",
    stars: 4,
    rating: 9.1,
    address: "Historic district, near restaurants and shops",
  },
  {
    name: "Metropolitan Business Hotel",
    pricePerNight: "EUR 121",
    stars: 3,
    rating: 8.3,
    address: "Central station area",
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

function findDestination(payload: unknown): DestinationMatch | null {
  const destinations = getDestinationItems(payload);

  for (const item of destinations) {
    const destination = asRecord(item);
    const destId = getStringValue(
      destination.dest_id,
      destination.destId,
      destination.id,
      destination.entityId,
    );

    if (destId === "Unknown") {
      continue;
    }

    return {
      destId,
      searchType: getStringValue(
        destination.search_type,
        destination.searchType,
        destination.dest_type,
        "CITY",
      ),
    };
  }

  return null;
}

function getPricePerNight(hotel: Record<string, unknown>) {
  const property = asRecord(hotel.property);
  const priceBreakdown = asRecord(hotel.priceBreakdown ?? property.priceBreakdown);
  const grossPrice = asRecord(priceBreakdown.grossPrice);
  const benefitBadge = asRecord(priceBreakdown.benefitBadge);

  return getStringValue(
    priceBreakdown.displayPrice,
    grossPrice.value,
    grossPrice.amount,
    grossPrice.formatted,
    benefitBadge.text,
    hotel.price,
    hotel.pricePerNight,
  );
}

function getStars(hotel: Record<string, unknown>) {
  const property = asRecord(hotel.property);

  return getStringValue(
    hotel.stars,
    hotel.starRating,
    hotel.class,
    property.propertyClass,
    property.starRating,
    property.class,
  );
}

function getRating(hotel: Record<string, unknown>) {
  const property = asRecord(hotel.property);
  const reviewScore = asRecord(hotel.reviewScore ?? property.reviewScore);

  return getStringValue(
    hotel.rating,
    hotel.reviewScore,
    reviewScore.score,
    property.reviewScore,
    property.reviewScoreWord,
  );
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
  );
}

function normalizeHotelOptions(payload: unknown): HotelOption[] {
  const response = asRecord(payload);
  const data = asRecord(response.data);
  const hotels =
    (Array.isArray(data.hotels) && data.hotels) ||
    (Array.isArray(data.result) && data.result) ||
    (Array.isArray(data.results) && data.results) ||
    (Array.isArray(response.hotels) && response.hotels) ||
    [];

  return hotels.slice(0, 3).map((hotel): HotelOption => {
    const hotelObject = asRecord(hotel);
    const property = asRecord(hotelObject.property);

    return {
      name: getStringValue(
        hotelObject.name,
        hotelObject.hotel_name,
        property.name,
        property.title,
      ),
      pricePerNight: getPricePerNight(hotelObject),
      stars: getStars(hotelObject),
      rating: getRating(hotelObject),
      address: getAddress(hotelObject),
    };
  });
}

function fallbackHotels(message: string) {
  return NextResponse.json({
    hotels: MOCK_HOTELS,
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
    return fallbackHotels("Missing RAPIDAPI_KEY environment variable.");
  }

  try {
    const destinationParams = new URLSearchParams({
      query: destination.trim(),
    });
    const destinationPayload = await rapidApiGet(
      `${BOOKING_DESTINATION_URL}?${destinationParams}`,
      rapidApiKey,
      "searchDestination",
    );
    const destinationMatch = findDestination(destinationPayload);

    if (!destinationMatch) {
      console.error("[search-hotels] No destination match found", {
        destination,
        payload: destinationPayload,
      });

      return fallbackHotels("Booking.com returned no destination match.");
    }

    const hotelParams = new URLSearchParams({
      dest_id: destinationMatch.destId,
      search_type: destinationMatch.searchType,
      arrival_date: checkIn.trim(),
      departure_date: checkOut.trim(),
      adults: String(adultCount),
      room_qty: "1",
    });
    const hotelPayload = await rapidApiGet(
      `${BOOKING_HOTELS_URL}?${hotelParams}`,
      rapidApiKey,
      "searchHotels",
    );
    const hotels = normalizeHotelOptions(hotelPayload);

    if (hotels.length === 0) {
      console.error("[search-hotels] RapidAPI returned no hotel options", {
        payload: hotelPayload,
      });

      return fallbackHotels("RapidAPI returned no hotel options.");
    }

    return NextResponse.json({ hotels });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected hotel search error.";

    console.error("[search-hotels] Request failed", error);

    return fallbackHotels(message);
  }
}

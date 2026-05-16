import { NextResponse } from "next/server";

const BOOKING_API_URL =
  "https://booking-com15.p.rapidapi.com/api/v1/hotels/searchDestination";
const RAPIDAPI_HOST = "booking-com15.p.rapidapi.com";

type SearchHotelsRequest = {
  destination?: unknown;
  checkIn?: unknown;
  checkOut?: unknown;
  adults?: unknown;
};

type HotelOption = {
  name: string;
  pricePerNight: string;
  stars: number | string;
  rating: number | string;
};

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

function getPricePerNight(hotel: Record<string, unknown>) {
  const property = asRecord(hotel.property);
  const priceBreakdown = asRecord(hotel.priceBreakdown ?? property.priceBreakdown);
  const grossPrice = asRecord(priceBreakdown.grossPrice);
  const strikethroughPrice = asRecord(priceBreakdown.strikethroughPrice);

  return getStringValue(
    priceBreakdown.displayPrice,
    grossPrice.value,
    grossPrice.amount,
    grossPrice.formatted,
    strikethroughPrice.value,
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
    hotel.reviewScoreWord,
    reviewScore.score,
    property.reviewScore,
    property.reviewScoreWord,
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

  const searchParams = new URLSearchParams({
    query: destination.trim(),
    checkin_date: checkIn.trim(),
    checkout_date: checkOut.trim(),
    adults: String(adultCount),
  });

  const response = await fetch(`${BOOKING_API_URL}?${searchParams}`, {
    method: "GET",
    headers: {
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": rapidApiKey,
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "Failed to search hotels.",
        status: response.status,
        details: await response.text(),
      },
      { status: response.status },
    );
  }

  const payload = await response.json();

  return NextResponse.json({
    hotels: normalizeHotelOptions(payload),
  });
}

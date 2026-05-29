import { NextResponse } from "next/server";
import type { HotelLevel } from "@/lib/quotes/build-quote";
import { passesApiHotelLevelFilter } from "@/lib/quotes/hotel-level-filter";
import {
  searchBookingHotels,
  type HotelOption,
} from "@/lib/hotels/search-booking";

export type { HotelOption };

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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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
  const rapidApiKey = rapidapiKeyFromBody ?? process.env.RAPIDAPI_KEY ?? "";

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

  const result = await searchBookingHotels({
    destination,
    checkIn,
    checkOut,
    adults: adultCount,
    rapidapiKey: rapidApiKey,
    propertyIds,
  });

  const hotels = filterHotelsByLevel(result.hotels, hotelLevel);

  if (result.fallback || hotels.length === 0) {
    return NextResponse.json({
      hotels,
      fallback: true,
      error:
        result.error ??
        (hotels.length === 0
          ? "RapidAPI returned no hotel options after level filter."
          : undefined),
    });
  }

  return NextResponse.json({ hotels });
}

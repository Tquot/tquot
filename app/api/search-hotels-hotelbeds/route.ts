import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { HotelOption } from "@/app/api/search-hotels/route";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";
import { HotelbedsAdapter } from "@/lib/connectors/adapters/hotelbeds";
import {
  getConnectionWithCredentials,
  listAgencyConnections,
} from "@/lib/connectors/storage";
import { resolveCity } from "@/lib/airports/search";
import { passesApiHotelLevelFilter } from "@/lib/quotes/hotel-level-filter";
import type { HotelLevel } from "@/lib/quotes/build-quote";

const HOTELBEDS_SEARCH_RADIUS_KM = 15;

/** Normalized city keys for hardcoded fallback lookup. */
function normalizeCityKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Tourist destinations when OpenFlights / city-groups has no match. */
const HARDCODED_CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  atenas: { lat: 37.9838, lng: 23.7275 },
  athens: { lat: 37.9838, lng: 23.7275 },
  bangkok: { lat: 13.7563, lng: 100.5018 },
  barcelona: { lat: 41.3874, lng: 2.1686 },
  berlin: { lat: 52.52, lng: 13.405 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  dublin: { lat: 53.3498, lng: -6.2603 },
  estambul: { lat: 41.0082, lng: 28.9784 },
  istanbul: { lat: 41.0082, lng: 28.9784 },
  lisboa: { lat: 38.7223, lng: -9.1393 },
  lisbon: { lat: 38.7223, lng: -9.1393 },
  londres: { lat: 51.5074, lng: -0.1278 },
  london: { lat: 51.5074, lng: -0.1278 },
  madrid: { lat: 40.4168, lng: -3.7038 },
  milan: { lat: 45.4642, lng: 9.19 },
  milano: { lat: 45.4642, lng: 9.19 },
  munich: { lat: 48.1351, lng: 11.582 },
  munchen: { lat: 48.1351, lng: 11.582 },
  new_york: { lat: 40.7128, lng: -74.006 },
  nueva_york: { lat: 40.7128, lng: -74.006 },
  paris: { lat: 48.8566, lng: 2.3522 },
  praga: { lat: 50.0755, lng: 14.4378 },
  prague: { lat: 50.0755, lng: 14.4378 },
  rom: { lat: 41.9028, lng: 12.4964 },
  roma: { lat: 41.9028, lng: 12.4964 },
  rome: { lat: 41.9028, lng: 12.4964 },
  venecia: { lat: 45.4408, lng: 12.3155 },
  venice: { lat: 45.4408, lng: 12.3155 },
  viena: { lat: 48.2082, lng: 16.3738 },
  vienna: { lat: 48.2082, lng: 16.3738 },
};

function resolveDestinationCoordinates(
  destination: string
): { lat: number; lng: number } | null {
  const trimmed = destination.trim();
  if (!trimmed) return null;

  const city = resolveCity(trimmed);
  if (city?.airports[0]) {
    const ap = city.airports[0];
    if (Number.isFinite(ap.latitude) && Number.isFinite(ap.longitude)) {
      return { lat: ap.latitude, lng: ap.longitude };
    }
  }

  const key = normalizeCityKey(trimmed);
  const hardcoded = HARDCODED_CITY_COORDINATES[key];
  if (hardcoded) return hardcoded;

  return null;
}

const BodySchema = z.object({
  destination: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  adults: z.number().int().min(1),
  children: z.number().int().min(0).default(0),
  hotelLevel: z.enum(["budget", "standard", "premium", "luxury"]).optional(),
  agencyId: z.string().optional(),
});

function toHotelOption(hotel: {
  name: string;
  category: number | null;
  address: string | null;
  rooms: Array<{
    roomType: string;
    netPrice: number;
    pricePerNight: number;
  }>;
}): HotelOption | null {
  if (!Array.isArray(hotel.rooms) || hotel.rooms.length === 0) return null;

  const sorted = hotel.rooms
    .filter((room) => Number.isFinite(room.pricePerNight) && room.pricePerNight > 0)
    .sort((a, b) => a.pricePerNight - b.pricePerNight);

  const cheapest = sorted[0];
  if (!cheapest) return null;

  return {
    name: hotel.name,
    pricePerNight: `${Math.round(cheapest.pricePerNight)} EUR`,
    stars: hotel.category ?? "Unknown",
    rating: "Unknown",
    address: hotel.address ?? "Unknown",
    roomType: cheapest.roomType || "Habitación doble",
    highlights: ["Hotelbeds", "Tarifa neta"],
    distanceFromCenter: "Distance unavailable",
    providerName: "Hotelbeds",
  };
}

function logHotelbedsFallback(
  message: string,
  context: {
    destination?: string;
    coordinates?: { lat: number; lng: number } | null;
    hotelbedsResponseBody?: unknown;
  } = {},
) {
  console.warn("[search-hotels-hotelbeds] fallback", {
    error: message,
    destination: context.destination,
    coordinates: context.coordinates ?? null,
    hotelbedsResponseBody: context.hotelbedsResponseBody,
  });
}

function fallbackHotels(
  message: string,
  context: {
    destination?: string;
    coordinates?: { lat: number; lng: number } | null;
    hotelbedsResponseBody?: unknown;
  } = {},
) {
  logHotelbedsFallback(message, context);
  return NextResponse.json({
    hotels: [] as HotelOption[],
    fallback: true,
    error: message,
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserAndAgency(request);
    if ("response" in auth) return auth.response;

    const body = BodySchema.parse(await request.json());
    const { destination, checkIn, checkOut, adults, children, hotelLevel } = body;

    // Use session agency only; body.agencyId is accepted for compatibility.
    const agencyConnections = await listAgencyConnections(auth.agencyId);
    const hotelbedsConnection = agencyConnections.find(
      (c) => c.provider_id === "hotelbeds"
    );

    if (!hotelbedsConnection) {
      return fallbackHotels("Hotelbeds no conectado para esta agencia.", {
        destination,
      });
    }

    const connectionData = await getConnectionWithCredentials(hotelbedsConnection.id);
    if (!connectionData) {
      return fallbackHotels(
        "No se pudieron cargar las credenciales de Hotelbeds para esta agencia.",
        { destination },
      );
    }

    const coordinates = resolveDestinationCoordinates(destination);
    if (!coordinates) {
      return fallbackHotels(
        `No se pudieron resolver coordenadas para "${destination}".`,
        { destination, coordinates: null },
      );
    }

    const adapter = new HotelbedsAdapter("hotelbeds");
    const result = await adapter.searchHotels(connectionData.credentials, {
      destination: {
        coordinates,
        radiusKm: HOTELBEDS_SEARCH_RADIUS_KM,
      },
      checkIn,
      checkOut,
      rooms: [{ adults, childrenAges: Array(children).fill(8) }],
      currency: "EUR",
      language: "ENG",
    });

    if (!result.ok) {
      return fallbackHotels(result.error, {
        destination,
        coordinates,
        hotelbedsResponseBody: result.rawResponse,
      });
    }

    const hotels = result.data
      .map(toHotelOption)
      .filter((h): h is HotelOption => Boolean(h))
      .filter((h) =>
        hotelLevel ? passesApiHotelLevelFilter(h.stars, hotelLevel as HotelLevel) : true
      );

    return NextResponse.json({ hotels });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected Hotelbeds search error.";
    return fallbackHotels(message);
  }
}

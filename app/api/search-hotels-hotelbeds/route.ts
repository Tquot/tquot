import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { HotelOption } from "@/app/api/search-hotels/route";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";
import { HotelbedsAdapter } from "@/lib/connectors/adapters/hotelbeds";
import {
  getConnectionWithCredentials,
  listAgencyConnections,
} from "@/lib/connectors/storage";
import { passesApiHotelLevelFilter } from "@/lib/quotes/hotel-level-filter";
import type { HotelLevel } from "@/lib/quotes/build-quote";

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
  };
}

function fallbackHotels(message: string) {
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
      return fallbackHotels("Hotelbeds no conectado para esta agencia.");
    }

    const connectionData = await getConnectionWithCredentials(hotelbedsConnection.id);
    if (!connectionData) {
      return fallbackHotels(
        "No se pudieron cargar las credenciales de Hotelbeds para esta agencia."
      );
    }

    const adapter = new HotelbedsAdapter("hotelbeds");
    const result = await adapter.searchHotels(connectionData.credentials, {
      destination: { city: destination },
      checkIn,
      checkOut,
      rooms: [{ adults, childrenAges: Array(children).fill(8) }],
      currency: "EUR",
      language: "es",
    });

    const hotels = result
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

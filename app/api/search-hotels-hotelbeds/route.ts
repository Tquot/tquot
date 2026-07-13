import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { HotelOption } from "@/lib/hotels/search-booking";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";
import {
  buildHotelbedsContentHeaders,
  HotelbedsAdapter,
  hotelbedsBaseUrl,
  parseHotelbedsCredentials,
} from "@/lib/connectors/adapters/hotelbeds";
import type { Credentials } from "@/lib/connectors/types";
import {
  getConnectionWithCredentials,
  listAgencyConnections,
} from "@/lib/connectors/storage";
import { fetchWithTimeout } from "@/lib/connectors/utils";
import { resolveCity } from "@/lib/airports/search";
import { enrichHotelOptionsWithContentBounded } from "@/lib/providers/hotelbeds/content-enrich";
import { passesApiHotelLevelFilter } from "@/lib/quotes/hotel-level-filter";
import type { HotelLevel } from "@/lib/quotes/build-quote";

const HOTELBEDS_SEARCH_RADIUS_KM = 15;
const HOTELBEDS_CONTENT_TIMEOUT_MS = 8_000;
const HOTELBEDS_PHOTO_BASE = "https://photos.hotelbeds.com/giata/bigger/";

type HotelbedsContentImage = {
  path?: string;
  type?: { code?: string } | string;
};

function hotelbedsPhotoUrl(path: string): string {
  return `${HOTELBEDS_PHOTO_BASE}${path}`;
}

function hotelbedsImageTypeCode(
  type: HotelbedsContentImage["type"],
): string | undefined {
  if (!type) return undefined;
  if (typeof type === "string") return type;
  return type.code;
}

function pickHotelbedsImagePath(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;

  const list = images as HotelbedsContentImage[];
  const gen = list.find(
    (img) =>
      hotelbedsImageTypeCode(img.type)?.toUpperCase() === "GEN" &&
      typeof img.path === "string" &&
      img.path.trim(),
  );
  const chosen =
    gen ??
    list.find((img) => typeof img.path === "string" && img.path.trim());
  const path = chosen?.path?.trim();
  return path || null;
}

async function fetchHotelbedsImageUrls(
  credentials: Credentials,
  hotelCodes: string[],
): Promise<Map<string, string>> {
  const imageByCode = new Map<string, string>();
  if (hotelCodes.length === 0) return imageByCode;

  try {
    const creds = parseHotelbedsCredentials(credentials);
    const codes = hotelCodes.join(",");
    const url = `${hotelbedsBaseUrl(creds)}/hotel-content-api/1.0/hotels?codes=${encodeURIComponent(codes)}&fields=images&language=ENG`;

    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: buildHotelbedsContentHeaders(creds),
      timeoutMs: HOTELBEDS_CONTENT_TIMEOUT_MS,
    });

    if (!response.ok) {
      console.warn("[search-hotels-hotelbeds] content images failed", {
        status: response.status,
        hotelCount: hotelCodes.length,
      });
      return imageByCode;
    }

    const data = (await response.json()) as {
      hotels?: Array<{ code?: string | number; images?: unknown }>;
    };

    for (const hotel of data.hotels ?? []) {
      if (hotel.code === undefined || hotel.code === null) continue;
      const path = pickHotelbedsImagePath(hotel.images);
      if (!path) continue;
      imageByCode.set(String(hotel.code), hotelbedsPhotoUrl(path));
    }
  } catch (error) {
    console.warn("[search-hotels-hotelbeds] content images error", {
      error: error instanceof Error ? error.message : "unknown",
      hotelCount: hotelCodes.length,
    });
  }

  return imageByCode;
}

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
  groupDistribution: z
    .object({
      doubles: z.number().int().min(0).default(0),
      singles: z.number().int().min(0).default(0),
      triples: z.number().int().min(0).default(0),
    })
    .optional(),
});

function buildRoomsFromGroupDistribution(params: {
  children: number;
  groupDistribution: {
    doubles: number;
    singles: number;
    triples: number;
  };
}): Array<{
  adults: number;
  childrenAges: number[];
}> {
  const { children, groupDistribution } = params;
  const childAges = Array.from({ length: children }, () => 8); // placeholder

  let childIndex = 0;

  const rooms: Array<{ adults: number; childrenAges: number[] }> = [];

  // Doble: 2 adultos (capacidad 2 pax) -> los niños se colocan en triples.
  for (let i = 0; i < groupDistribution.doubles; i += 1) {
    rooms.push({ adults: 2, childrenAges: [] });
  }

  // Individual: 1 adulto + 0 niños.
  for (let i = 0; i < groupDistribution.singles; i += 1) {
    rooms.push({ adults: 1, childrenAges: [] });
  }

  // Triple: 2 adultos + 0..1 niño.
  for (let i = 0; i < groupDistribution.triples; i += 1) {
    const hasChild = childIndex < childAges.length;
    rooms.push({
      adults: 2,
      childrenAges: hasChild ? [childAges[childIndex]!] : [],
    });
    if (hasChild) childIndex += 1;
  }

  return rooms;
}

import { parseBoardOptionsFromRooms } from "@/lib/providers/hotelbeds/parse-board-options";

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  const diff = Math.max(0, end - start);
  return Math.max(1, Math.round(diff / 86_400_000));
}

function toHotelOption(
  hotel: {
    providerHotelId: string;
    name: string;
    category: number | null;
    address: string | null;
    rooms: Array<{
      roomType: string;
      boardType?: string;
      netPrice: number;
      pricePerNight: number;
      providerRoomCode: string;
      refundable?: boolean;
      rawData?: unknown;
      currency?: string;
    }>;
  },
  nights: number,
): HotelOption | null {
  if (!Array.isArray(hotel.rooms) || hotel.rooms.length === 0) return null;

  const boardOptions = parseBoardOptionsFromRooms(hotel.rooms, nights);
  const sorted = hotel.rooms
    .filter((room) => Number.isFinite(room.pricePerNight) && room.pricePerNight > 0)
    .sort((a, b) => a.pricePerNight - b.pricePerNight);

  const cheapest = sorted[0];
  if (!cheapest) return null;

  const selected =
    boardOptions[0] ??
    ({
      boardCode: cheapest.boardType ?? "RO",
      rateKey: cheapest.providerRoomCode,
      totalPrice: cheapest.netPrice,
      netPrice: cheapest.pricePerNight,
      currency: cheapest.currency ?? "EUR",
    } as const);

  const cancellationPolicies = extractCancellationPolicies(
    cheapest.rawData,
    selected.currency ?? "EUR",
  );

  return {
    name: hotel.name,
    pricePerNight: `${Math.round(selected.netPrice)} EUR`,
    ...(Number.isFinite(selected.totalPrice)
      ? { netPrice: selected.totalPrice }
      : Number.isFinite(cheapest.netPrice)
        ? { netPrice: cheapest.netPrice }
        : {}),
    stars: hotel.category ?? "Unknown",
    rating: "Unknown",
    address: hotel.address ?? "Unknown",
    roomType: cheapest.roomType || "Habitación doble",
    highlights: ["Hotelbeds", "Tarifa neta"],
    distanceFromCenter: "Distance unavailable",
    providerName: "Hotelbeds",
    hotelCode: hotel.providerHotelId,
    ...(selected.rateKey ? { rateKey: selected.rateKey } : {}),
    ...(selected.boardCode ? { boardCode: selected.boardCode } : {}),
    ...(boardOptions.length > 0 ? { boardOptions } : {}),
    ...(cancellationPolicies.length > 0 ? { cancellationPolicies } : {}),
  };
}

function extractCancellationPolicies(
  rawData: unknown,
  fallbackCurrency: string,
): import("@/lib/providers/hotelbeds/content-types").CancellationPolicy[] {
  if (!rawData || typeof rawData !== "object") return [];
  const rate = rawData as {
    cancellationPolicies?: Array<{
      from?: string;
      amount?: string | number;
      currency?: string;
    }>;
  };
  if (!Array.isArray(rate.cancellationPolicies)) return [];

  return rate.cancellationPolicies
    .filter((cp) => typeof cp.from === "string" && cp.from.trim())
    .map((cp) => ({
      amount: Number(cp.amount ?? 0),
      currency: cp.currency ?? fallbackCurrency,
      from: cp.from!.trim(),
    }));
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
    const { destination, checkIn, checkOut, adults, children, hotelLevel, groupDistribution } = body;

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
    const rooms =
      groupDistribution && (groupDistribution.doubles + groupDistribution.singles + groupDistribution.triples > 0)
        ? buildRoomsFromGroupDistribution({ children, groupDistribution })
        : [{ adults, childrenAges: Array(children).fill(8) }];
    const result = await adapter.searchHotels(connectionData.credentials, {
      destination: {
        coordinates,
        radiusKm: HOTELBEDS_SEARCH_RADIUS_KM,
      },
      checkIn,
      checkOut,
      rooms,
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

    const hotelCodes = result.data
      .map((hotel) => hotel.providerHotelId)
      .filter((code) => Boolean(code));
    const imageByCode = await fetchHotelbedsImageUrls(
      connectionData.credentials,
      hotelCodes,
    );

    const nights = nightsBetween(checkIn, checkOut);

    const hotels = result.data
      .map((hotel): HotelOption | null => {
        const option = toHotelOption(hotel, nights);
        if (!option) return null;
        const imageUrl = imageByCode.get(hotel.providerHotelId);
        return {
          ...option,
          connectionId: hotelbedsConnection.id,
          ...(imageUrl ? { imageUrl } : {}),
        } as HotelOption;
      })
      .filter((h): h is HotelOption => h !== null)
      .filter((h) =>
        hotelLevel ? passesApiHotelLevelFilter(h.stars, hotelLevel as HotelLevel) : true
      );

    const enriched = await enrichHotelOptionsWithContentBounded(
      hotels,
      connectionData.credentials,
    );

    return NextResponse.json({ hotels: enriched });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected Hotelbeds search error.";
    return fallbackHotels(message);
  }
}

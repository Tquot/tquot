import { getAdapter } from "@/lib/connectors/registry";
import { getConnectionWithCredentials } from "@/lib/connectors/storage";
import type { ProviderPriceResult, ProviderSearchParams } from "./types";

export async function queryHotelbedsPrice(
  params: ProviderSearchParams,
  options?: { connectionId?: string; hotelCode?: string },
): Promise<ProviderPriceResult> {
  const adapter = getAdapter("hotelbeds");
  if (!adapter?.searchHotels) {
    throw new Error("hotelbeds_not_available");
  }

  let credentials: Record<string, string> = {};
  if (options?.connectionId) {
    const connection = await getConnectionWithCredentials(options.connectionId);
    if (!connection) {
      throw new Error("hotelbeds_connection_not_found");
    }
    credentials = connection.credentials;
  } else {
    const apiKey = process.env.HOTELBEDS_API_KEY?.trim();
    const secret = process.env.HOTELBEDS_SECRET?.trim();
    if (!apiKey || !secret) {
      throw new Error("hotelbeds_not_configured");
    }
    credentials = {
      api_key: apiKey,
      secret,
      environment: process.env.HOTELBEDS_ENVIRONMENT ?? "test",
    };
  }

  const hotelCodes = options?.hotelCode ? [options.hotelCode] : [];
  const result = await adapter.searchHotels(credentials, {
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    rooms: params.guests.map((guest) => ({
      adults: guest.adults,
      childrenAges: guest.children ? [guest.children] : [],
    })),
    destination: {
      city: params.destination,
      hotelCodes,
    },
    currency: "EUR",
    language: "CAS",
  });

  if (!result.ok) {
    throw new Error(result.error ?? "no_results");
  }

  const hotels = result.data;
  if (!hotels.length) {
    throw new Error("no_results");
  }

  const target = params.hotelName.trim().toLowerCase();
  const hotel =
    hotels.find((entry) => entry.name.trim().toLowerCase().includes(target)) ??
    hotels[0];
  const bestRoom = hotel.rooms.reduce(
    (cheapest, room) =>
      !cheapest || room.netPrice < cheapest.netPrice ? room : cheapest,
    hotel.rooms[0],
  );

  if (!bestRoom || bestRoom.netPrice <= 0) {
    throw new Error("no_price");
  }

  return {
    netPrice: Math.round(bestRoom.netPrice),
    currency: bestRoom.currency || "EUR",
    rateKey: bestRoom.providerRoomCode,
    meta: {
      roomType: bestRoom.roomType,
      refundable: bestRoom.refundable,
      breakfast: bestRoom.boardType !== "RO",
    },
  };
}

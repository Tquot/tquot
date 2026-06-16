import { searchBookingHotels } from "@/lib/hotels/search-booking";
import type { ProviderPriceResult, ProviderSearchParams } from "./types";

function parsePricePerNight(value: string | number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (!value) return 0;
  const match = String(value).match(/\d+(?:[.,]\d+)?/);
  if (!match) return 0;
  return Number(match[0].replace(",", "."));
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  const diff = Math.max(0, end - start);
  return Math.max(1, Math.round(diff / 86_400_000));
}

export async function queryBookingPrice(
  params: ProviderSearchParams,
  rapidapiKey?: string,
): Promise<ProviderPriceResult> {
  const key = rapidapiKey?.trim() || process.env.RAPIDAPI_KEY?.trim() || "";
  if (!key) {
    throw new Error("booking_not_configured");
  }

  const adults =
    params.guests.reduce((sum, guest) => sum + guest.adults, 0) || 2;

  const result = await searchBookingHotels({
    destination: params.destination,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    adults,
    rapidapiKey: key,
  });

  if (result.fallback || !result.hotels?.length) {
    throw new Error(result.error ?? "no_results");
  }

  const target = params.hotelName.trim().toLowerCase();
  const match =
    result.hotels.find((hotel) => {
      const name = hotel.name.trim().toLowerCase();
      return name.includes(target) || target.includes(name);
    }) ?? result.hotels[0];

  const nights = nightsBetween(params.checkIn, params.checkOut);
  const pricePerNight = parsePricePerNight(match.pricePerNight);
  const netPrice =
    Number.isFinite(match.netPrice) && match.netPrice! > 0
      ? Math.round(match.netPrice!)
      : Math.round(pricePerNight * nights);

  if (!Number.isFinite(netPrice) || netPrice <= 0) {
    throw new Error("no_price");
  }

  return {
    netPrice,
    currency: "EUR",
    rateKey: match.propertyId ?? match.hotelCode,
    meta: {
      roomType: match.roomType,
      refundable: false,
      breakfast: false,
    },
  };
}

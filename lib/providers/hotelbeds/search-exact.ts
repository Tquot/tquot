import "server-only";
import { queryHotelbedsPrice } from "@/lib/providers/hotelbeds";
import type { ProviderSearchParams } from "@/lib/providers/types";

export interface SearchExactInput {
  hotelName: string;
  hotelCode?: string;
  connectionId?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  destination: string;
}

export interface SearchExactResult {
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  hotelName: string;
  rateKey?: string;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  const diff = Math.max(0, end - start);
  return Math.max(1, Math.round(diff / 86_400_000));
}

/**
 * Re-consulta Hotelbeds exacta (para refrescar snapshot, no para live compare).
 */
export async function searchHotelbedsExact(
  input: SearchExactInput,
): Promise<SearchExactResult | null> {
  const params: ProviderSearchParams = {
    hotelName: input.hotelName,
    destination: input.destination,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: [
      {
        adults: input.adults,
        ...(input.children > 0 ? { children: input.children } : {}),
      },
    ],
  };

  try {
    const result = await queryHotelbedsPrice(params, {
      connectionId: input.connectionId,
      hotelCode: input.hotelCode,
    });
    const nights = nightsBetween(input.checkIn, input.checkOut);
    const totalPrice = result.netPrice;
    const pricePerNight = Math.round(totalPrice / nights);
    return {
      pricePerNight,
      totalPrice,
      currency: result.currency,
      hotelName: input.hotelName,
      rateKey: result.rateKey,
    };
  } catch {
    return null;
  }
}

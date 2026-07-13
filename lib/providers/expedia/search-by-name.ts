import "server-only";
import { queryExpediaPrice } from "@/lib/providers/expedia";
import type { ProviderSearchParams } from "@/lib/providers/types";

export interface SearchByNameInput {
  hotelName: string;
  hotelCode?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  destination: string;
}

export interface SearchByNameResult {
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  hotelName: string;
  bookingUrl?: string;
  rateKey?: string;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  const diff = Math.max(0, end - start);
  return Math.max(1, Math.round(diff / 86_400_000));
}

/**
 * Expedia como segundo/tercer proveedor live (existente en el repo).
 */
export async function searchExpediaByName(
  input: SearchByNameInput,
): Promise<SearchByNameResult | null> {
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
    const result = await queryExpediaPrice(params);
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

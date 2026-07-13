import "server-only";
import { queryBookingPrice } from "@/lib/providers/booking";
import type { ProviderSearchParams } from "@/lib/providers/types";

export interface SearchByNameInput {
  hotelName: string;
  hotelCode?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  destination: string;
  bookingApiKey?: string;
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
 * Mejor match Booking por nombre + fechas + ocupación.
 */
export async function searchBookingByName(
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
    const result = await queryBookingPrice(params, input.bookingApiKey);
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

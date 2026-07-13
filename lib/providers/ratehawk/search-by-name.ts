import "server-only";

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

/**
 * Stub RateHawk: aún no integrado. Devuelve null → fila "No encontrado".
 */
export async function searchRateHawkByName(
  _input: SearchByNameInput,
): Promise<SearchByNameResult | null> {
  return null;
}

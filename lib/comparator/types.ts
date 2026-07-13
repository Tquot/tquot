/**
 * Bloque A — tipos del comparador coherente (snapshot vs live).
 *
 * Adaptación TQuot: no hay `quotes.snapshot` jsonb; el "snapshot" es el
 * HotelDetails / hotelDetails en memoria de la cotización abierta.
 */

export type ProviderKey =
  | "hotelbeds"
  | "booking"
  | "expedia"
  | "ratehawk"
  | "own";

export interface ComparatorEntry {
  provider: ProviderKey;
  source: "snapshot" | "live";
  available: boolean;
  pricePerNight?: number;
  totalPrice?: number;
  currency: string;
  nights: number;
  hotelName: string;
  /** ISO timestamp */
  fetchedAt: string;
  /** Calculado al construir la respuesta */
  ageMinutes: number;
  rateKey?: string;
  bookingUrl?: string;
  /** Si la búsqueda live falló */
  error?: string;
}

export interface ComparatorHotelSnapshot {
  id: string;
  name: string;
  provider: ProviderKey;
  netPrice: number;
  currency: string;
  fetchedAt: string;
  hotelCode?: string;
  rateKey?: string;
  connectionId?: string;
  nights?: number;
}

export interface ComparatorSearchContext {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: Array<{ adults: number; children?: number }>;
}

/**
 * Request adaptado: el hotel snapshot viaja en el body (no se lee de DB).
 * `quoteId` es opcional para futuras persistencias.
 */
export interface ComparatorRequest {
  quoteId?: string;
  hotelId: string;
  legId?: string;
  hotel: ComparatorHotelSnapshot;
  searchContext: ComparatorSearchContext;
  /** Proveedores a consultar live (el original se fuerza a snapshot). */
  providers: ProviderKey[];
  /** API key Booking resuelta en la route (opcional). */
  bookingApiKey?: string;
}

export interface ComparatorResponse {
  hotelName: string;
  entries: ComparatorEntry[];
  generatedAt: string;
}

export interface RefreshSnapshotInput {
  hotel: ComparatorHotelSnapshot;
  searchContext: ComparatorSearchContext;
}

export interface RefreshSnapshotResult {
  success: boolean;
  oldPrice?: number;
  newPrice?: number;
  currency?: string;
  rateKey?: string;
  fetchedAt?: string;
  error?: string;
}

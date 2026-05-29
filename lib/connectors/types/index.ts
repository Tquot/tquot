/**
 * ─────────────────────────────────────────────────────────────
 *  Tipos compartidos del sistema de connectors
 * ─────────────────────────────────────────────────────────────
 *
 *  Esta es la API pública del sistema. TODO adaptador (Hotelbeds, Duffel,
 *  RateHawk, etc.) implementa la interfaz `ProviderAdapter` y produce
 *  resultados que cumplen las interfaces normalizadas (`NormalizedHotel`,
 *  `NormalizedFlight`, etc.).
 *
 *  Filosofía:
 *  - Cada API es distinta. La normalización ocurre en el adaptador.
 *  - El resto de TQuot (comparator, buildQuote, UI) trabaja con tipos normalizados.
 *  - Si añadís un campo nuevo a un tipo normalizado, todos los adaptadores
 *    deben actualizarse para devolverlo.
 */

export type ProviderCategory =
  | "hotels"
  | "flights"
  | "activities"
  | "transfers"
  | "insurance"
  | "cars";

export type AuthType =
  | "api_key"
  | "api_key_secret"
  | "oauth_bearer"
  | "basic_auth"
  | "custom";

export type ConnectionStatus = "pending" | "active" | "error" | "disabled";

// ─────────────────────────────────────────────────────────────
// Credenciales (opacas — cada adaptador sabe qué espera)
// ─────────────────────────────────────────────────────────────

export type Credentials = Record<string, string>;

// ─────────────────────────────────────────────────────────────
// Resultado de probar una conexión
// ─────────────────────────────────────────────────────────────

export type TestConnectionResult =
  | { ok: true; message: string; elapsedMs: number }
  | { ok: false; error: string; elapsedMs: number };

// ─────────────────────────────────────────────────────────────
// Búsqueda de hoteles — input normalizado
// ─────────────────────────────────────────────────────────────

export interface HotelSearchParams {
  destination: {
    city?: string;            // "Madrid"
    countryCode?: string;     // "ES"
    coordinates?: { lat: number; lng: number };
    radiusKm?: number;        // si se da coordenadas, radio de búsqueda
    hotelCodes?: string[];    // para buscar hoteles específicos (comparador pre-reserva)
  };
  checkIn: string;            // ISO date "2026-07-12"
  checkOut: string;           // ISO date "2026-07-19"
  rooms: Array<{
    adults: number;
    childrenAges: number[];   // edades de los niños, vacío si no hay
  }>;
  currency?: string;          // ISO 4217. Si no se da, el proveedor decide.
  language?: string;          // ISO 639-1. Default "es".
}

// ─────────────────────────────────────────────────────────────
// Búsqueda de hoteles — output normalizado
// ─────────────────────────────────────────────────────────────

export interface NormalizedHotel {
  /** ID único del hotel EN EL PROVEEDOR (no es global) */
  providerHotelId: string;

  /** Datos del hotel (lo que el proveedor da) */
  name: string;
  category: number | null;          // estrellas
  city: string | null;
  countryCode: string | null;
  address: string | null;
  coordinates?: { lat: number; lng: number };
  description?: string;
  images?: string[];                 // URLs de imágenes

  /** Habitaciones disponibles con sus precios */
  rooms: NormalizedRoom[];

  /** Metadatos para el comparador y la traza */
  _provider: {
    id: string;                      // "hotelbeds"
    name: string;                    // "Hotelbeds"
    rawDataSnippet?: unknown;        // primeros campos del raw, para debug
  };
}

export interface NormalizedRoom {
  /** Identificador único de la habitación + tarifa en el proveedor.
   *  Crítico: este es el código que el agente lleva al extranet
   *  para reservar exactamente esta habitación. */
  providerRoomCode: string;

  roomType: string;                   // "Habitación Doble Estándar"
  boardType: BoardType;
  refundable: boolean;
  cancellationDeadline: string | null;  // ISO datetime hasta cuándo es gratis cancelar

  /** Precios */
  netPrice: number;                    // precio neto para la agencia
  publicPrice: number | null;          // precio público sugerido (si lo da el proveedor)
  currency: string;                    // ISO 4217
  pricePerNight: number;               // calculado, neto/noches

  /** Comisión (si el proveedor la informa) */
  commissionPercent: number | null;
  commissionAmount: number | null;

  /** URL profunda al extranet del proveedor para reservar ESTA tarifa */
  bookingDeepLink?: string;

  /** Metadatos sin estructurar para debug y trazabilidad */
  rawData?: unknown;
}

export type BoardType =
  | "RO"   // Room Only / Solo alojamiento
  | "BB"   // Bed & Breakfast / Alojamiento y desayuno
  | "HB"   // Half Board / Media pensión
  | "FB"   // Full Board / Pensión completa
  | "AI"   // All Inclusive / Todo incluido
  | "UNSPECIFIED";

// ─────────────────────────────────────────────────────────────
// Búsqueda de vuelos — input normalizado
// ─────────────────────────────────────────────────────────────

export interface FlightSearchParams {
  origin: string;             // IATA "MAD"
  destination: string;        // IATA "FCO"
  departureDate: string;      // ISO date
  returnDate?: string;        // ISO date, vacío para solo ida

  passengers: {
    adults: number;
    children: number;         // 2-11 años
    infants: number;          // 0-1 años (sin asiento)
  };

  cabinClass?: "economy" | "premium_economy" | "business" | "first";
  maxStops?: number;
  preferredAirlines?: string[];  // códigos IATA de aerolíneas
  currency?: string;
}

// ─────────────────────────────────────────────────────────────
// Búsqueda de vuelos — output normalizado
// ─────────────────────────────────────────────────────────────

export interface NormalizedFlight {
  providerOfferId: string;     // ID único de la oferta en el proveedor

  /** Itinerario de ida (y vuelta si aplica) */
  slices: FlightSlice[];

  /** Precio total para todos los pasajeros */
  totalPrice: number;
  currency: string;

  /** Tarifas detalladas si el proveedor las da */
  pricePerAdult?: number;
  pricePerChild?: number;
  pricePerInfant?: number;

  /** Cuándo expira esta oferta (importante con Duffel/Amadeus) */
  expiresAt: string | null;    // ISO datetime

  /** Equipaje incluido */
  baggageIncluded?: {
    carryOn: boolean;
    checked: number;            // número de maletas facturadas incluidas
  };

  /** URL profunda para reservar (cuando aplique) */
  bookingDeepLink?: string;

  _provider: {
    id: string;
    name: string;
    rawDataSnippet?: unknown;
  };
}

export interface FlightSlice {
  origin: string;               // IATA
  destination: string;          // IATA
  departureTime: string;        // ISO datetime
  arrivalTime: string;          // ISO datetime
  duration: number;             // minutos totales
  segments: FlightSegment[];
}

export interface FlightSegment {
  origin: string;               // IATA
  destination: string;          // IATA
  departureTime: string;
  arrivalTime: string;
  carrier: string;              // IATA aerolínea "IB"
  flightNumber: string;         // "3170"
  cabinClass: string;
  durationMinutes: number;
}

// ─────────────────────────────────────────────────────────────
// Actividades (categoría aparte, no implementada en v1)
// ─────────────────────────────────────────────────────────────

export interface ActivitySearchParams {
  destination: string;          // texto libre "Roma" o "Madrid centro"
  date?: string;                // ISO date, opcional
  language?: string;
  participants?: number;
}

export interface NormalizedActivity {
  providerActivityId: string;
  name: string;
  description: string;
  durationMinutes: number | null;
  pricePerPerson: number;
  currency: string;
  images?: string[];
  rating?: number;
  bookingDeepLink?: string;
  _provider: {
    id: string;
    name: string;
  };
}

// ─────────────────────────────────────────────────────────────
// Resultado de una búsqueda (genérico)
// ─────────────────────────────────────────────────────────────

export type SearchResult<T> =
  | {
      ok: true;
      data: T[];
      elapsedMs: number;
      providerInfo: { id: string; name: string };
    }
  | {
      ok: false;
      error: string;
      errorCode?: string;       // "TIMEOUT", "AUTH", "RATE_LIMIT", "NO_RESULTS", "API_ERROR"
      elapsedMs: number;
      providerInfo: { id: string; name: string };
      rawResponse?: unknown;
    };

// ─────────────────────────────────────────────────────────────
// Interfaz que TODO adaptador implementa
// ─────────────────────────────────────────────────────────────
//
// Esta es la pieza central del sistema. Cuando Sonnet implemente un
// adaptador nuevo (RateHawk, W2M, etc.), debe crear una clase que
// implemente esta interfaz.
//
// No todos los adaptadores soportan todos los métodos. Por ejemplo:
//   - Hotelbeds soporta searchHotels, NO searchFlights
//   - Duffel soporta searchFlights, NO searchHotels
//   - Civitatis soporta searchActivities, NO los otros
//
// Los métodos no soportados se omiten (no se implementan en la clase).
// La función `getAdapter` solo intenta llamar a métodos compatibles
// con la categoría del proveedor.
// ─────────────────────────────────────────────────────────────

export interface ProviderAdapter {
  /** ID del proveedor en provider_catalog */
  readonly providerId: string;

  /** Nombre legible */
  readonly providerName: string;

  /** Categorías que soporta este adaptador */
  readonly categories: ProviderCategory[];

  /**
   * Verifica que las credenciales funcionan.
   * Hace una llamada ligera a la API (ej: obtener perfil, listar destinos).
   * Debe completarse en < 5 segundos.
   */
  testConnection(credentials: Credentials): Promise<TestConnectionResult>;

  /** Búsqueda de hoteles (solo si categories incluye "hotels") */
  searchHotels?(
    credentials: Credentials,
    params: HotelSearchParams,
    options?: AdapterCallOptions
  ): Promise<SearchResult<NormalizedHotel>>;

  /** Búsqueda de vuelos (solo si categories incluye "flights") */
  searchFlights?(
    credentials: Credentials,
    params: FlightSearchParams,
    options?: AdapterCallOptions
  ): Promise<SearchResult<NormalizedFlight>>;

  /** Búsqueda de actividades (solo si categories incluye "activities") */
  searchActivities?(
    credentials: Credentials,
    params: ActivitySearchParams,
    options?: AdapterCallOptions
  ): Promise<SearchResult<NormalizedActivity>>;
}

export interface AdapterCallOptions {
  /** Timeout en milisegundos. Si no se da, default 10000. */
  timeoutMs?: number;

  /** Señal de abort externa (útil en comparador con AbortController) */
  signal?: AbortSignal;

  /** Si true, devolver rawData completo en los resultados (debug) */
  includeRawData?: boolean;
}

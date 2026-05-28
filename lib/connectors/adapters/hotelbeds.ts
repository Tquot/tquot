/**
 * ─────────────────────────────────────────────────────────────
 *  Adaptador de Hotelbeds
 *  ESTADO: FUNCIONAL — adaptador de referencia
 * ─────────────────────────────────────────────────────────────
 *
 *  Docs oficiales:
 *  https://developer.hotelbeds.com/documentation/hotels/booking-api/api-reference/
 *
 *  Autenticación:
 *  - Header X-Signature = SHA256(apiKey + secret + timestamp_unix)
 *  - Header Api-key = apiKey
 *  - Header Accept = application/json
 *
 *  Endpoints usados:
 *  - GET  /hotel-content-api/1.0/types/countries  (test connection, ligero)
 *  - POST /hotel-api/1.0/hotels                   (búsqueda de disponibilidad)
 *
 *  Entornos:
 *  - test:       https://api.test.hotelbeds.com
 *  - production: https://api.hotelbeds.com
 *
 *  IMPORTANTE:
 *  Este adaptador implementa SOLO búsqueda (search). Hotelbeds tiene también
 *  endpoints de reserva (booking), pero NO los usamos porque TQuot no reserva.
 *  El agente reserva en el extranet de Hotelbeds vía deep linking.
 */

import { createHash } from "node:crypto";
import type {
  ProviderAdapter,
  ProviderCategory,
  Credentials,
  TestConnectionResult,
  HotelSearchParams,
  NormalizedHotel,
  NormalizedRoom,
  BoardType,
  SearchResult,
  AdapterCallOptions,
} from "../types";
import {
  ConnectorError,
  fetchWithTimeout,
  parseJsonOrThrow,
  tryAdapter,
  nightsBetween,
} from "../utils";

// ─────────────────────────────────────────────────────────────
// Configuración
// ─────────────────────────────────────────────────────────────

const ENDPOINTS = {
  test: "https://api.test.hotelbeds.com",
  production: "https://api.hotelbeds.com",
} as const;

interface HotelbedsCredentials {
  api_key: string;
  secret: string;
  environment?: "test" | "production";
}

interface HotelbedsSearchBody {
  stay: { checkIn: string; checkOut: string };
  occupancies: Array<{
    rooms: number;
    adults: number;
    children: number;
    paxes: Array<{ type: "AD" } | { type: "CH"; age: number }>;
  }>;
  language: string;
  currency: string;
  hotels?: { hotel: number[] };
  geolocation?: {
    latitude: number;
    longitude: number;
    radius: number;
    unit: "km";
  };
}

interface HotelbedsRawRate {
  rateKey?: string;
  boardCode?: string;
  rateClass?: string;
  cancellationPolicies?: Array<{ from?: string }>;
  net?: string | number;
  sellingRate?: string | number;
  commission?: string | number;
  currency?: string;
}

interface HotelbedsRawRoom {
  name?: string;
  rates?: HotelbedsRawRate[];
}

interface HotelbedsRawHotel {
  code?: string | number;
  name?: string;
  categoryCode?: string;
  destinationName?: string;
  countryCode?: string;
  address?: string;
  latitude?: string | number;
  longitude?: string | number;
  rooms?: HotelbedsRawRoom[];
}

// ─────────────────────────────────────────────────────────────
// Helper: generar X-Signature de Hotelbeds
// ─────────────────────────────────────────────────────────────

function buildSignature(apiKey: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return createHash("sha256")
    .update(apiKey + secret + timestamp)
    .digest("hex");
}

function buildHeaders(creds: HotelbedsCredentials): Record<string, string> {
  return {
    "Api-key": creds.api_key,
    "X-Signature": buildSignature(creds.api_key, creds.secret),
    Accept: "application/json",
    "Content-Type": "application/json",
    "Accept-Encoding": "gzip",
  };
}

function baseUrl(creds: HotelbedsCredentials): string {
  return ENDPOINTS[creds.environment ?? "test"];
}

// ─────────────────────────────────────────────────────────────
// Adaptador
// ─────────────────────────────────────────────────────────────

export class HotelbedsAdapter implements ProviderAdapter {
  readonly providerId: string;
  readonly providerName = "Hotelbeds";
  readonly categories: ProviderCategory[] = ["hotels"];

  constructor(
    providerId:
      | "hotelbeds"
      | "hotelbeds-hotels"
      | "hotelbeds-activities"
      | "hotelbeds-transfers" = "hotelbeds"
  ) {
    this.providerId = providerId;
  }

  // ───── Test connection ─────

  async testConnection(rawCreds: Credentials): Promise<TestConnectionResult> {
    const startedAt = Date.now();
    const creds = this.validateCredentials(rawCreds);

    try {
      const statusPath = this.getStatusPath();
      const url = `${baseUrl(creds)}${statusPath}`;
      const response = await fetchWithTimeout(url, {
        method: "GET",
        headers: buildHeaders(creds),
        timeoutMs: 5_000,
      });

      const data = await parseJsonOrThrow<Record<string, unknown>>(
        response,
        this.providerId
      );
      const elapsedMs = Date.now() - startedAt;

      if (data && typeof data === "object") {
        return {
          ok: true,
          message: "Conexión OK. API responde correctamente.",
          elapsedMs,
        };
      }

      return {
        ok: false,
        error: `Respuesta inesperada de Hotelbeds en ${statusPath}.`,
        elapsedMs,
      };
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof ConnectorError
            ? err.message
            : (err as Error).message ?? "Error desconocido",
        elapsedMs: Date.now() - startedAt,
      };
    }
  }

  // ───── Búsqueda de hoteles ─────

  async searchHotels(
    rawCreds: Credentials,
    params: HotelSearchParams,
    options?: AdapterCallOptions
  ): Promise<SearchResult<NormalizedHotel>> {
    const creds = this.validateCredentials(rawCreds);

    return tryAdapter(
      this.providerId,
      this.providerName,
      async () => {
        const requestBody = this.buildSearchBody(params);
        const url = `${baseUrl(creds)}/hotel-api/1.0/hotels`;

        const response = await fetchWithTimeout(url, {
          method: "POST",
          headers: buildHeaders(creds),
          body: JSON.stringify(requestBody),
          timeoutMs: options?.timeoutMs ?? 10_000,
          signal: options?.signal,
        });

        const data = await parseJsonOrThrow<{
          hotels?: { hotels?: HotelbedsRawHotel[] };
        }>(response, this.providerId);

        if (!data?.hotels?.hotels || data.hotels.hotels.length === 0) {
          // Sin resultados no es un error, devolvemos array vacío
          return [];
        }

        const nights = nightsBetween(params.checkIn, params.checkOut);

        return data.hotels.hotels.map((h) =>
          this.normalizeHotel(h, nights, options?.includeRawData)
        );
      },
      options
    );
  }

  // ───── Validación de credenciales ─────

  private validateCredentials(raw: Credentials): HotelbedsCredentials {
    if (!raw.api_key || !raw.secret) {
      throw new ConnectorError(
        "Faltan api_key o secret en las credenciales de Hotelbeds",
        "AUTH",
        this.providerId
      );
    }
    return {
      api_key: raw.api_key,
      secret: raw.secret,
      environment:
        raw.environment === "production" ? "production" : "test",
    };
  }

  private getStatusPath(): string {
    if (this.providerId === "hotelbeds-activities") {
      return "/activities-api/1.0/status";
    }
    if (this.providerId === "hotelbeds-transfers") {
      return "/transfers-api/1.0/status";
    }
    return "/hotel-api/1.0/status";
  }

  // ───── Construir body de búsqueda ─────

  private buildSearchBody(params: HotelSearchParams): HotelbedsSearchBody {
    const body: HotelbedsSearchBody = {
      stay: {
        checkIn: params.checkIn,
        checkOut: params.checkOut,
      },
      occupancies: params.rooms.map((r) => ({
        rooms: 1,
        adults: r.adults,
        children: r.childrenAges.length,
        paxes: [
          ...Array(r.adults).fill({ type: "AD" }),
          ...r.childrenAges.map((age) => ({ type: "CH", age })),
        ],
      })),
      language: params.language?.toUpperCase() ?? "ES",
      currency: params.currency ?? "EUR",
    };

    // Destination: 3 modos posibles, Hotelbeds requiere uno
    if (params.destination.hotelCodes?.length) {
      body.hotels = { hotel: params.destination.hotelCodes.map(Number) };
    } else if (params.destination.coordinates) {
      body.geolocation = {
        latitude: params.destination.coordinates.lat,
        longitude: params.destination.coordinates.lng,
        radius: params.destination.radiusKm ?? 20,
        unit: "km",
      };
    } else if (params.destination.countryCode || params.destination.city) {
      // Buscar por destino requiere el código de destino de Hotelbeds.
      // En v1 no tenemos un mapeo ciudad→destinationCode, así que esto
      // requiere que el agente pase hotelCodes o coordenadas.
      // TODO: añadir tabla destination_codes que mapee city → destCode Hotelbeds.
      throw new ConnectorError(
        "Búsqueda por ciudad sin código de destino aún no soportada. Pasar hotelCodes o coordinates.",
        "INVALID_PARAMS",
        this.providerId
      );
    } else {
      throw new ConnectorError(
        "params.destination debe incluir hotelCodes, coordinates o countryCode+city.",
        "INVALID_PARAMS",
        this.providerId
      );
    }

    return body;
  }

  // ───── Normalización ─────

  private normalizeHotel(
    raw: HotelbedsRawHotel,
    nights: number,
    includeRawData?: boolean
  ): NormalizedHotel {
    const rooms = this.normalizeRooms(raw.rooms ?? [], nights);

    return {
      providerHotelId: String(raw.code),
      name: raw.name ?? "Hotel sin nombre",
      category: raw.categoryCode ? parseHotelStars(raw.categoryCode) : null,
      city: raw.destinationName ?? null,
      countryCode: raw.countryCode ?? null,
      address: raw.address ?? null,
      coordinates:
        raw.latitude && raw.longitude
          ? { lat: Number(raw.latitude), lng: Number(raw.longitude) }
          : undefined,
      rooms,
      _provider: {
        id: this.providerId,
        name: this.providerName,
        rawDataSnippet: includeRawData
          ? raw
          : { code: raw.code, name: raw.name, categoryCode: raw.categoryCode },
      },
    };
  }

  private normalizeRooms(
    rawRooms: HotelbedsRawRoom[],
    nights: number
  ): NormalizedRoom[] {
    const rooms: NormalizedRoom[] = [];

    for (const room of rawRooms) {
      if (!Array.isArray(room.rates)) continue;

      for (const rate of room.rates) {
        const netPrice = Number(rate.net ?? 0);
        const publicPrice = rate.sellingRate ? Number(rate.sellingRate) : null;

        const commissionPercent = rate.commission
          ? Number(rate.commission)
          : null;
        const commissionAmount =
          commissionPercent && publicPrice
            ? (publicPrice * commissionPercent) / 100
            : null;

        rooms.push({
          providerRoomCode: String(rate.rateKey ?? ""),
          roomType: room.name ?? "Habitación",
          boardType: mapBoardType(rate.boardCode),
          refundable: rate.rateClass !== "NRF",
          cancellationDeadline: rate.cancellationPolicies?.[0]?.from ?? null,
          netPrice,
          publicPrice,
          currency: rate.currency ?? "EUR",
          pricePerNight: netPrice / nights,
          commissionPercent,
          commissionAmount,
          bookingDeepLink: undefined, // Hotelbeds no expone deep link público directo
          rawData: rate,
        });
      }
    }

    return rooms;
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers de mapeo
// ─────────────────────────────────────────────────────────────

function mapBoardType(boardCode?: string): BoardType {
  if (!boardCode) return "UNSPECIFIED";
  const upper = boardCode.toUpperCase();
  if (upper.startsWith("RO") || upper.startsWith("SA")) return "RO";
  if (upper.startsWith("BB") || upper.startsWith("AD")) return "BB";
  if (upper.startsWith("HB") || upper.startsWith("MP")) return "HB";
  if (upper.startsWith("FB") || upper.startsWith("PC")) return "FB";
  if (upper.startsWith("AI") || upper.startsWith("TI")) return "AI";
  return "UNSPECIFIED";
}

function parseHotelStars(categoryCode: string): number | null {
  // Hotelbeds usa códigos tipo "3EST", "4EST", "5EST"
  const match = categoryCode.match(/(\d)/);
  return match ? Number(match[1]) : null;
}

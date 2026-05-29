/**
 * Adaptador de Booking.com vía RapidAPI.
 * Reutiliza POST /api/search-hotels con la clave RapidAPI de la agencia.
 */

import type { HotelOption } from "@/app/api/search-hotels/route";
import type {
  ProviderAdapter,
  ProviderCategory,
  Credentials,
  TestConnectionResult,
  HotelSearchParams,
  NormalizedHotel,
  NormalizedRoom,
  SearchResult,
  AdapterCallOptions,
} from "../types";
import {
  ConnectorError,
  fetchWithTimeout,
  tryAdapter,
  nightsBetween,
} from "../utils";

interface BookingCredentials {
  rapidapi_key: string;
}

type SearchHotelsApiResponse = {
  hotels?: HotelOption[];
  fallback?: boolean;
  error?: string;
};

function resolveInternalApiOrigin(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  return base.replace(/\/$/, "");
}

function testSearchDates(): { checkIn: string; checkOut: string } {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 30);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2);
  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
  };
}

function parsePriceString(value: string | number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (!value) return 0;

  const match = String(value).match(/\d+(?:[.,]\d+)?/);
  if (!match) return 0;

  return Math.round(Number(match[0].replace(",", ".")));
}

function parseStars(value: number | string): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : null;
}

export class BookingAdapter implements ProviderAdapter {
  readonly providerId = "booking";
  readonly providerName = "Booking.com";
  readonly categories: ProviderCategory[] = ["hotels"];

  private validateCredentials(raw: Credentials): BookingCredentials {
    const rapidapi_key = raw.rapidapi_key?.trim();
    if (!rapidapi_key) {
      throw new ConnectorError(
        "Falta rapidapi_key en las credenciales de Booking.com",
        "AUTH",
        this.providerId,
      );
    }
    return { rapidapi_key };
  }

  private async callSearchHotelsApi(
    creds: BookingCredentials,
    body: Record<string, unknown>,
    options?: AdapterCallOptions,
  ): Promise<SearchHotelsApiResponse> {
    const url = `${resolveInternalApiOrigin()}/api/search-hotels`;
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, rapidapiKey: creds.rapidapi_key }),
      timeoutMs: options?.timeoutMs ?? 10_000,
      signal: options?.signal,
    });

    let data: SearchHotelsApiResponse;
    try {
      data = (await response.json()) as SearchHotelsApiResponse;
    } catch {
      throw new ConnectorError(
        "Respuesta no válida de /api/search-hotels",
        "API_ERROR",
        this.providerId,
        response.status,
      );
    }

    if (!response.ok) {
      throw new ConnectorError(
        data.error ?? `HTTP ${response.status} desde /api/search-hotels`,
        "API_ERROR",
        this.providerId,
        response.status,
        data,
      );
    }

    if (data.fallback) {
      throw new ConnectorError(
        data.error ?? "Booking.com devolvió datos de fallback",
        "NO_RESULTS",
        this.providerId,
        response.status,
        data,
      );
    }

    return data;
  }

  async testConnection(rawCreds: Credentials): Promise<TestConnectionResult> {
    const startedAt = Date.now();
    const creds = this.validateCredentials(rawCreds);
    const { checkIn, checkOut } = testSearchDates();

    try {
      const data = await this.callSearchHotelsApi(creds, {
        destination: "Madrid",
        checkIn,
        checkOut,
        adults: 2,
      });

      const hotels = data.hotels ?? [];
      const elapsedMs = Date.now() - startedAt;

      if (hotels.length > 0) {
        return {
          ok: true,
          message: `Conexión OK. ${hotels.length} hotel(es) de prueba encontrados.`,
          elapsedMs,
        };
      }

      return {
        ok: false,
        error: "Booking.com respondió sin hoteles para la búsqueda de prueba.",
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

  async searchHotels(
    rawCreds: Credentials,
    params: HotelSearchParams,
    options?: AdapterCallOptions,
  ): Promise<SearchResult<NormalizedHotel>> {
    const creds = this.validateCredentials(rawCreds);

    return tryAdapter(this.providerId, this.providerName, async () => {
      const destination = params.destination.city?.trim();
      if (!destination) {
        throw new ConnectorError(
          "Booking.com requiere destination.city para buscar hoteles.",
          "INVALID_PARAMS",
          this.providerId,
        );
      }

      const adults = params.rooms[0]?.adults ?? 2;
      const propertyIds = params.destination.hotelCodes;

      const data = await this.callSearchHotelsApi(
        creds,
        {
          destination,
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          adults,
          ...(propertyIds?.length ? { propertyIds } : {}),
        },
        options,
      );

      const nights = nightsBetween(params.checkIn, params.checkOut);
      const hotels = (data.hotels ?? [])
        .map((hotel) => this.normalizeHotelOption(hotel, nights))
        .filter((hotel): hotel is NormalizedHotel => Boolean(hotel));

      return hotels;
    }, options);
  }

  private normalizeHotelOption(
    hotel: HotelOption,
    nights: number,
  ): NormalizedHotel | null {
    const pricePerNight = parsePriceString(hotel.pricePerNight);
    if (!Number.isFinite(pricePerNight) || pricePerNight <= 0) {
      return null;
    }

    const netPrice = Math.round(pricePerNight * nights);
    const providerHotelId =
      (hotel.propertyId ?? hotel.hotelCode ?? hotel.name.trim()) || "unknown";

    const room: NormalizedRoom = {
      providerRoomCode: `${providerHotelId}-${hotel.roomType}`,
      roomType: hotel.roomType || "Habitación doble",
      boardType: "UNSPECIFIED",
      refundable: false,
      cancellationDeadline: null,
      netPrice,
      publicPrice: null,
      currency: "EUR",
      pricePerNight,
      commissionPercent: null,
      commissionAmount: null,
    };

    return {
      providerHotelId: String(providerHotelId),
      name: hotel.name,
      category: parseStars(hotel.stars),
      city: null,
      countryCode: null,
      address: hotel.address ?? null,
      rooms: [room],
      _provider: {
        id: this.providerId,
        name: this.providerName,
        rawDataSnippet: {
          propertyId: hotel.propertyId,
          pricePerNight: hotel.pricePerNight,
        },
      },
    };
  }
}

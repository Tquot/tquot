/**
 * Adaptador de Booking.com vía RapidAPI.
 * Usa lib/hotels/search-booking directamente (sin self-fetch HTTP).
 */

import {
  searchBookingHotels,
  type HotelOption,
} from "@/lib/hotels/search-booking";
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
import { ConnectorError, tryAdapter, nightsBetween } from "../utils";

interface BookingCredentials {
  rapidapi_key: string;
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

  async testConnection(rawCreds: Credentials): Promise<TestConnectionResult> {
    const startedAt = Date.now();
    const creds = this.validateCredentials(rawCreds);
    const { checkIn, checkOut } = testSearchDates();

    try {
      const result = await searchBookingHotels({
        destination: "Madrid",
        checkIn,
        checkOut,
        adults: 2,
        rapidapiKey: creds.rapidapi_key,
      });

      const elapsedMs = Date.now() - startedAt;

      if (result.fallback) {
        return {
          ok: false,
          error: result.error ?? "Booking.com devolvió datos de fallback.",
          elapsedMs,
        };
      }

      if ((result.hotels ?? []).length > 0) {
        return {
          ok: true,
          message: `Conexión OK. ${result.hotels.length} hotel(es) de prueba encontrados.`,
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

      const result = await searchBookingHotels({
        destination,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        adults,
        rapidapiKey: creds.rapidapi_key,
        ...(propertyIds?.length ? { propertyIds } : {}),
      });

      if (result.fallback) {
        throw new ConnectorError(
          result.error ?? "Booking.com devolvió datos de fallback",
          "NO_RESULTS",
          this.providerId,
        );
      }

      const nights = nightsBetween(params.checkIn, params.checkOut);
      const hotels = (result.hotels ?? [])
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

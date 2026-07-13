import "server-only";
import { searchBookingByName } from "@/lib/providers/booking/search-by-name";
import { searchExpediaByName } from "@/lib/providers/expedia/search-by-name";
import { searchHotelbedsExact } from "@/lib/providers/hotelbeds/search-exact";
import { searchRateHawkByName } from "@/lib/providers/ratehawk/search-by-name";
import type {
  ComparatorEntry,
  ComparatorRequest,
  ComparatorResponse,
  ProviderKey,
} from "./types";

function minutesSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.round((Date.now() - t) / 60_000));
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  const diff = Math.max(0, end - start);
  return Math.max(1, Math.round(diff / 86_400_000));
}

interface ProviderSearchInput {
  provider: ProviderKey;
  hotelName: string;
  hotelCode?: string;
  connectionId?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  destination: string;
  bookingApiKey?: string;
}

interface ProviderSearchResult {
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  hotelName: string;
  bookingUrl?: string;
  rateKey?: string;
}

/**
 * Proveedor original → snapshot. Resto → live.
 * Hotelbeds live solo se usa en refresh explícito (searchHotelbedsExact).
 */
async function searchProviderForSameHotel(
  input: ProviderSearchInput,
): Promise<ProviderSearchResult | null> {
  switch (input.provider) {
    case "booking":
      return searchBookingByName(input);
    case "expedia":
      return searchExpediaByName(input);
    case "ratehawk":
      return searchRateHawkByName(input);
    case "hotelbeds":
      // Solo vía refresh; en compare live no se re-busca el original.
      return searchHotelbedsExact(input);
    case "own":
      return null;
    default:
      return null;
  }
}

function unavailableEntry(
  provider: ProviderKey,
  hotel: ComparatorRequest["hotel"],
  nights: number,
  error: string,
): ComparatorEntry {
  return {
    provider,
    source: "live",
    available: false,
    currency: hotel.currency,
    nights,
    hotelName: hotel.name,
    fetchedAt: new Date().toISOString(),
    ageMinutes: 0,
    error,
  };
}

/**
 * Construye la comparación coherente:
 * - Fila snapshot del proveedor original (precio de la cotización)
 * - Filas live del resto de proveedores
 */
export async function buildComparison(
  req: ComparatorRequest,
): Promise<ComparatorResponse> {
  const hotel = req.hotel;
  const { checkIn, checkOut, destination, guests } = req.searchContext;
  const nights =
    hotel.nights && hotel.nights > 0
      ? hotel.nights
      : nightsBetween(checkIn, checkOut);

  const adults =
    guests.reduce((sum, g) => sum + g.adults, 0) || 2;
  const children = guests.reduce((sum, g) => sum + (g.children ?? 0), 0);

  const originalProvider = hotel.provider;
  const otherProviders = req.providers.filter((p) => p !== originalProvider);

  const fetchedAt =
    hotel.fetchedAt && !Number.isNaN(Date.parse(hotel.fetchedAt))
      ? hotel.fetchedAt
      : new Date().toISOString();

  const snapshotEntry: ComparatorEntry = {
    provider: originalProvider,
    source: "snapshot",
    available: true,
    pricePerNight: Math.round(hotel.netPrice / nights),
    totalPrice: hotel.netPrice,
    currency: hotel.currency,
    nights,
    hotelName: hotel.name,
    fetchedAt,
    ageMinutes: minutesSince(fetchedAt),
    rateKey: hotel.rateKey,
  };

  const liveResults = await Promise.allSettled(
    otherProviders.map((provider) =>
      searchProviderForSameHotel({
        provider,
        hotelName: hotel.name,
        hotelCode: hotel.hotelCode,
        connectionId: hotel.connectionId,
        checkIn,
        checkOut,
        adults,
        children,
        destination,
        bookingApiKey: req.bookingApiKey,
      }),
    ),
  );

  const liveEntries: ComparatorEntry[] = liveResults.map((result, idx) => {
    const provider = otherProviders[idx]!;
    if (result.status === "rejected") {
      return unavailableEntry(
        provider,
        hotel,
        nights,
        result.reason instanceof Error ? result.reason.message : "unknown",
      );
    }
    const data = result.value;
    if (!data) {
      return unavailableEntry(provider, hotel, nights, "not_found");
    }
    return {
      provider,
      source: "live",
      available: true,
      pricePerNight: data.pricePerNight,
      totalPrice: data.totalPrice,
      currency: data.currency,
      nights,
      hotelName: data.hotelName,
      fetchedAt: new Date().toISOString(),
      ageMinutes: 0,
      bookingUrl: data.bookingUrl,
      rateKey: data.rateKey,
    };
  });

  return {
    hotelName: hotel.name,
    entries: [snapshotEntry, ...liveEntries],
    generatedAt: new Date().toISOString(),
  };
}

import { providerSlug } from "@/lib/connectors/provider-logo";
import type { QuoteItem } from "@/lib/quotes/build-quote";
import type { Flight, Hotel } from "@/lib/quote-engine/types";
import { DEFAULT_TRIP_LEG_ID } from "@/lib/quote-engine/schemas-v2";
import {
  parseHotelContextFromTitle,
  parseHotelNightsFromTitle,
} from "@/lib/hotels/parse-hotel-title";

function resolveHotelProvider(item: QuoteItem): Hotel["provider"] | null {
  const slug = item.hotelDetails?.provider ?? providerSlug(item.provider);
  if (slug === "hotelbeds" || slug === "booking") {
    return slug;
  }
  if (slug === "own" || item.source === "inventory") {
    return "own";
  }
  const label = item.provider.toLowerCase();
  if (label.includes("hotelbeds")) return "hotelbeds";
  if (label.includes("booking")) return "booking";
  return null;
}

export function quoteItemToHotel(item: QuoteItem, legId = DEFAULT_TRIP_LEG_ID): Hotel | null {
  if (item.type !== "hotel") return null;

  const provider = resolveHotelProvider(item);
  if (!provider || provider === "own") return null;

  const context = parseHotelContextFromTitle(item.title);
  const nights = parseHotelNightsFromTitle(item.title) ?? 1;

  return {
    id: item.id,
    legId,
    name: context.name || item.title.split("—")[0]?.trim() || item.title,
    netPrice: Math.round(item.price / nights),
    currency: item.currency ?? item.hotelDetails?.currency ?? "EUR",
    nights,
    stars: context.stars ? Number.parseInt(context.stars, 10) || 0 : 0,
    provider,
    fetchedAt: item.hotelDetails?.fetchedAt ?? new Date().toISOString(),
    hotelCode: item.hotelDetails?.hotelCode,
    rateKey: item.hotelDetails?.rateKey,
    totalForGroup: item.price,
    imageUrl: item.imageUrl,
    description: item.description,
    boardCode: item.hotelDetails?.boardCode,
    boardOptions: item.hotelDetails?.boardOptions,
    content: item.hotelDetails?.content,
    connectionId: item.hotelDetails?.connectionId,
    originalPrice: item.originalPrice,
    originalCurrency: item.originalCurrency,
    exchangeRate: item.exchangeRate,
    rateAt: item.rateAt,
  };
}

function extractCarrierIata(item: QuoteItem): string {
  const flightNumber = item.flightDetails?.flightNumber ?? "";
  const fromNumber = flightNumber.match(/^([A-Z0-9]{2})/i);
  if (fromNumber) return fromNumber[1].toUpperCase();

  const provider = item.provider.trim();
  if (/^[A-Z0-9]{2}$/i.test(provider)) {
    return provider.toUpperCase();
  }

  return provider.slice(0, 2).toUpperCase();
}

export function quoteItemToFlight(item: QuoteItem, legId = DEFAULT_TRIP_LEG_ID): Flight | null {
  if (item.type !== "flight") return null;

  const fd = item.flightDetails;
  const carrier = extractCarrierIata(item);

  return {
    id: item.id,
    legId,
    carrier,
    carrierName: fd?.airline ?? item.provider,
    price: item.price,
    currency: item.currency ?? "EUR",
    origin: fd?.originIata ?? fd?.originCity,
    destination: fd?.destinationIata ?? fd?.destinationCity,
    offerId: fd?.selectedOfferId ?? fd?.primaryOfferId,
    originalPrice: item.originalPrice,
    originalCurrency: item.originalCurrency,
    exchangeRate: item.exchangeRate,
    rateAt: item.rateAt,
    slices: fd
      ? [
          {
            departureDate: fd.departureDate,
            segments: [
              {
                origin: { iata_code: fd.originIata },
                destination: { iata_code: fd.destinationIata },
                flightNumber: fd.flightNumber,
                departureTime: fd.departureTime,
              },
            ],
          },
        ]
      : undefined,
  };
}

export function handoffProviderForHotel(item: QuoteItem): string | null {
  const hotel = quoteItemToHotel(item);
  return hotel?.provider ?? null;
}

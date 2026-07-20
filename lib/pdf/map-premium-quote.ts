import { quoteItemToFlight, quoteItemToHotel } from "@/lib/booking-handoff/item-adapters";
import {
  parseHotelContextFromTitle,
  parseHotelNightsFromTitle,
} from "@/lib/hotels/parse-hotel-title";
import type { Quote } from "@/lib/quote-engine/types";
import { itemsForPricing } from "@/lib/quotes/build-quote";
import type {
  PremiumPdfFlight,
  PremiumPdfHotel,
  PremiumPdfQuote,
} from "./premium-types";

function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

interface QuoteRowMeta {
  departure_date: string;
  return_date: string;
  destination: string;
  origin: string;
}

export function mapSnapshotToPremiumQuote(
  snapshot: Quote,
  meta: QuoteRowMeta,
): PremiumPdfQuote {
  let cursorDate = String(meta.departure_date);

  const hotels: PremiumPdfHotel[] = itemsForPricing(snapshot.hotels).map(
    (item) => {
      const mapped = quoteItemToHotel(item);
      const ctx = parseHotelContextFromTitle(item.title);
      const nights =
        mapped?.nights ?? parseHotelNightsFromTitle(item.title) ?? 1;
      const checkIn = cursorDate;
      const checkOut = addDaysIso(checkIn, nights);
      cursorDate = checkOut;

      const base = mapped ?? {
        id: item.id,
        legId: "leg-1",
        name: ctx.name || item.title,
        netPrice: Math.round(item.price / Math.max(1, nights)),
        currency: item.currency ?? "EUR",
        nights,
        stars: ctx.stars ? Number.parseInt(ctx.stars, 10) || 0 : 0,
        provider: "hotelbeds" as const,
        fetchedAt: new Date().toISOString(),
      };

      return {
        ...base,
        name: base.name,
        imageUrl: item.imageUrl ?? base.imageUrl,
        description: item.description ?? base.description,
        boardCode: base.boardCode ?? "RO",
        checkIn,
        checkOut,
        destination: ctx.location ?? meta.destination,
      } satisfies PremiumPdfHotel;
    },
  );

  const flights: PremiumPdfFlight[] = itemsForPricing(snapshot.flights).map(
    (item) => {
      const mapped = quoteItemToFlight(item);
      const fd = item.flightDetails;
      return {
        id: item.id,
        legId: mapped?.legId ?? "leg-1",
        carrier: mapped?.carrier ?? item.provider.slice(0, 2).toUpperCase(),
        carrierName: mapped?.carrierName ?? item.provider,
        price: item.finalPrice,
        currency: item.currency ?? "EUR",
        origin: mapped?.origin ?? fd?.originIata ?? meta.origin,
        destination:
          mapped?.destination ?? fd?.destinationIata ?? meta.destination,
        departureDate: fd?.departureDate ?? String(meta.departure_date),
        name: item.title,
        slices: mapped?.slices,
      };
    },
  );

  const experiences = itemsForPricing(snapshot.experiences).map((item) => ({
    id: item.id,
    name: item.title,
    destination: meta.destination,
    duration: item.description ?? undefined,
    price: item.finalPrice,
    currency: item.currency ?? snapshot.pricing.currency,
  }));

  const transfers = itemsForPricing(snapshot.transfers).map((item) => ({
    id: item.id,
    name: item.title,
    description: item.description,
    destination: meta.destination,
    price: item.finalPrice,
    currency: item.currency ?? snapshot.pricing.currency,
  }));

  return {
    id: snapshot.id,
    hotels,
    flights,
    experiences,
    transfers,
    pricing: snapshot.pricing,
    recommendations: snapshot.recommendations,
    itinerary: snapshot.itinerary,
    group: snapshot.group,
  };
}

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

function amenitiesFromContent(
  content: NonNullable<Hotel["content"]> | undefined,
): string[] {
  if (!content?.facilities?.length) return [];
  const keys: string[] = [];
  for (const facility of content.facilities) {
    const desc = facility.description.toLowerCase();
    if (desc.includes("wifi") || desc.includes("wi-fi") || desc.includes("internet")) {
      if (!keys.includes("wifi")) keys.push("wifi");
    } else if (desc.includes("breakfast") || desc.includes("desayuno")) {
      if (!keys.includes("breakfast")) keys.push("breakfast");
    } else if (desc.includes("pool") || desc.includes("piscina") || desc.includes("swimming")) {
      if (!keys.includes("pool")) keys.push("pool");
    } else if (desc.includes("parking") || desc.includes("aparcamiento") || desc.includes("garage")) {
      if (!keys.includes("parking")) keys.push("parking");
    } else if (desc.includes("spa")) {
      if (!keys.includes("spa")) keys.push("spa");
    } else if (desc.includes("gym") || desc.includes("fitness") || desc.includes("gimnasio")) {
      if (!keys.includes("gym")) keys.push("gym");
    }
  }
  return keys;
}

export function quoteItemToHotel(item: QuoteItem, legId = DEFAULT_TRIP_LEG_ID): Hotel | null {
  if (item.type !== "hotel") return null;

  const provider = resolveHotelProvider(item);
  if (!provider || provider === "own") return null;

  const context = parseHotelContextFromTitle(item.title);
  const nights = parseHotelNightsFromTitle(item.title) ?? 1;
  const content = item.hotelDetails?.content;
  const contentImages = (content?.images ?? [])
    .map((img) => img.url)
    .filter(Boolean);
  const images =
    contentImages.length > 0
      ? contentImages
      : item.imageUrl
        ? [item.imageUrl]
        : [];
  const selectedBoard = item.hotelDetails?.boardOptions?.find(
    (opt) => opt.boardCode === item.hotelDetails?.boardCode,
  );

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
    imageUrl: item.imageUrl ?? images[0],
    images,
    description:
      item.description ??
      content?.descriptionShort ??
      content?.descriptionLong,
    address: content?.address ?? context.location ?? undefined,
    destination: content?.destinationName ?? content?.zoneName ?? undefined,
    amenities: amenitiesFromContent(content),
    refundable: selectedBoard?.refundable,
    cancellationDeadline: content?.cancellationPolicies?.[0]?.from,
    boardCode: item.hotelDetails?.boardCode,
    boardOptions: item.hotelDetails?.boardOptions,
    content,
    accessibility: item.hotelDetails?.accessibility,
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
    duration: fd?.duration,
    fareClass: fd?.cabinClass ?? fd?.fareName,
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
                arrivalTime: fd.arrivalTime,
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

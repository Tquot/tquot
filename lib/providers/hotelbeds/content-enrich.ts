import "server-only";
import type { Credentials } from "@/lib/connectors/types";
import type { HotelOption } from "@/lib/hotels/search-booking";
import type { Hotel } from "@/lib/quote-engine/types";
import type { CancellationPolicy, HotelContent } from "./content-api";
import { getHotelContent } from "./content-cache";

const ENRICH_CONCURRENCY = 5;
const ENRICH_TIMEOUT_MS = 3_000;

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]!, index);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length)) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

function mergeCancellationPolicies(
  content: HotelContent,
  policies?: CancellationPolicy[],
): HotelContent {
  if (!policies || policies.length === 0) return content;
  return { ...content, cancellationPolicies: policies };
}

/**
 * Enriquece hoteles del canvas (`Hotel`) con Content API.
 */
export async function enrichWithContent(
  hotels: Hotel[],
  credentials: Credentials,
): Promise<Hotel[]> {
  return mapWithConcurrency(hotels, ENRICH_CONCURRENCY, async (hotel) => {
    if (hotel.provider !== "hotelbeds" || !hotel.hotelCode) return hotel;
    if (hotel.content) return hotel;

    try {
      const content = await getHotelContent(hotel.hotelCode, credentials);
      if (!content) return hotel;
      return {
        ...hotel,
        content,
        imageUrl: hotel.imageUrl ?? content.images[0]?.url,
        description:
          hotel.description ??
          content.descriptionLong ??
          content.descriptionShort,
      };
    } catch (err) {
      console.error(`[enrich] failed for ${hotel.hotelCode}:`, err);
      return hotel;
    }
  });
}

/**
 * Enriquece `HotelOption` del search route (forma usada por build-quote).
 */
export async function enrichHotelOptionsWithContent(
  hotels: HotelOption[],
  credentials: Credentials,
): Promise<HotelOption[]> {
  return mapWithConcurrency(hotels, ENRICH_CONCURRENCY, async (hotel) => {
    if (!hotel.hotelCode) return hotel;
    if (hotel.content) return hotel;

    try {
      const content = await getHotelContent(hotel.hotelCode, credentials);
      if (!content) return hotel;

      const withPolicies = mergeCancellationPolicies(
        content,
        hotel.cancellationPolicies,
      );

      return {
        ...hotel,
        content: withPolicies,
        imageUrl:
          hotel.imageUrl ??
          withPolicies.images.find((i) => i.type === "main")?.url ??
          withPolicies.images[0]?.url,
        description:
          hotel.description ??
          withPolicies.descriptionLong ??
          withPolicies.descriptionShort,
      };
    } catch (err) {
      console.error(`[enrich] failed for ${hotel.hotelCode}:`, err);
      return hotel;
    }
  });
}

/**
 * Enrich with a soft timeout so search latency stays bounded.
 * On timeout, returns hotels as-is (UI can load content on expand).
 */
export async function enrichHotelOptionsWithContentBounded(
  hotels: HotelOption[],
  credentials: Credentials,
  timeoutMs = ENRICH_TIMEOUT_MS,
): Promise<HotelOption[]> {
  return Promise.race([
    enrichHotelOptionsWithContent(hotels, credentials),
    new Promise<HotelOption[]>((resolve) =>
      setTimeout(() => resolve(hotels), timeoutMs),
    ),
  ]);
}

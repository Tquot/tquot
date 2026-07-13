import "server-only";
import type { Credentials } from "@/lib/connectors/types";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchHotelContentRaw, type HotelContent } from "./content-api";

const TTL_DAYS = 30;

type ContentRow = {
  hotel_code: string;
  name: string;
  description_short: string | null;
  description_long: string | null;
  category_code: string | null;
  category_label: string | null;
  zone_name: string | null;
  destination_name: string | null;
  country_code: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  web: string | null;
  images: HotelContent["images"] | null;
  facilities: HotelContent["facilities"] | null;
  cancellation_policies: HotelContent["cancellationPolicies"] | null;
  fetched_at: string;
};

export async function getHotelContent(
  hotelCode: string,
  credentials: Credentials,
): Promise<HotelContent | null> {
  const code = hotelCode.trim();
  if (!code) return null;

  const supabase = createServiceClient();

  const { data: cached } = await supabase
    .from("hotelbeds_content")
    .select("*")
    .eq("hotel_code", code)
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cached) return rowToContent(cached as ContentRow);

  let fresh: HotelContent | null = null;
  try {
    fresh = await fetchHotelContentRaw({ hotelCode: code, credentials });
  } catch (err) {
    console.error(`[content-api] fetch failed for ${code}:`, err);
    const { data: stale } = await supabase
      .from("hotelbeds_content")
      .select("*")
      .eq("hotel_code", code)
      .maybeSingle();
    return stale ? rowToContent(stale as ContentRow) : null;
  }

  if (!fresh) return null;

  const now = new Date();
  const expires = new Date(now.getTime() + TTL_DAYS * 86_400_000);

  const { error: upsertError } = await supabase.from("hotelbeds_content").upsert({
    hotel_code: fresh.hotelCode,
    name: fresh.name,
    description_short: fresh.descriptionShort ?? null,
    description_long: fresh.descriptionLong ?? null,
    category_code: fresh.categoryCode ?? null,
    category_label: fresh.categoryLabel ?? null,
    zone_name: fresh.zoneName ?? null,
    destination_name: fresh.destinationName ?? null,
    country_code: fresh.countryCode ?? null,
    latitude: fresh.coordinates?.lat ?? null,
    longitude: fresh.coordinates?.lng ?? null,
    address: fresh.address ?? null,
    phone: fresh.phone ?? null,
    email: fresh.email ?? null,
    web: fresh.website ?? null,
    images: fresh.images,
    facilities: fresh.facilities,
    cancellation_policies: fresh.cancellationPolicies,
    fetched_at: now.toISOString(),
    expires_at: expires.toISOString(),
  });

  if (upsertError) {
    console.error(`[content-cache] upsert failed for ${code}:`, upsertError);
  }

  return fresh;
}

/** Read-only cache lookup (no external fetch). Used by PDF loaders. */
export async function getCachedHotelContent(
  hotelCode: string,
): Promise<HotelContent | null> {
  const code = hotelCode.trim();
  if (!code) return null;

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("hotelbeds_content")
      .select("*")
      .eq("hotel_code", code)
      .maybeSingle();
    return data ? rowToContent(data as ContentRow) : null;
  } catch (err) {
    console.error(`[content-cache] read failed for ${code}:`, err);
    return null;
  }
}

function rowToContent(row: ContentRow): HotelContent {
  const lat = row.latitude != null ? Number(row.latitude) : NaN;
  const lng = row.longitude != null ? Number(row.longitude) : NaN;

  return {
    hotelCode: row.hotel_code,
    name: row.name,
    descriptionShort: row.description_short ?? undefined,
    descriptionLong: row.description_long ?? undefined,
    categoryCode: row.category_code ?? undefined,
    categoryLabel: row.category_label ?? undefined,
    zoneName: row.zone_name ?? undefined,
    destinationName: row.destination_name ?? undefined,
    countryCode: row.country_code ?? undefined,
    coordinates:
      Number.isFinite(lat) && Number.isFinite(lng)
        ? { lat, lng }
        : undefined,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    website: row.web ?? undefined,
    images: row.images ?? [],
    facilities: row.facilities ?? [],
    cancellationPolicies: row.cancellation_policies ?? [],
    fetchedAt: row.fetched_at,
  };
}

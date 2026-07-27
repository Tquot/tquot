import { createServiceClient } from "@/lib/supabase/service";
import type {
  AccessibilityInfo,
  HotelFeatures,
} from "./types";

/**
 * Punto de extensión TUR4all. Sin API pública abierta: leemos
 * `accessibility_records` (manual / import). Cuando exista API, actualizar aquí.
 */

interface LookupInput {
  hotelbedsCode?: string;
  name: string;
  destination?: string;
  itemType: "hotel" | "experience" | "transfer";
}

type AccessibilityRow = {
  features: Record<string, boolean | undefined>;
  external_provider: string | null;
  source_url: string | null;
  verified: boolean;
  verified_at: string | null;
  notes: string | null;
};

export async function fetchAccessibilityRecord<
  F extends Record<string, boolean | undefined>,
>(input: LookupInput): Promise<AccessibilityInfo<F> | null> {
  const supabase = createServiceClient();

  if (input.hotelbedsCode) {
    const { data } = await supabase
      .from("accessibility_records")
      .select("*")
      .eq("hotelbeds_code", input.hotelbedsCode)
      .eq("item_type", input.itemType)
      .maybeSingle();

    if (data) return mapRecord<F>(data as AccessibilityRow);
  }

  let query = supabase
    .from("accessibility_records")
    .select("*")
    .eq("item_type", input.itemType)
    .ilike("name", `%${input.name}%`);

  if (input.destination) {
    query = query.ilike("destination", `%${input.destination}%`);
  }

  const { data: byName } = await query.limit(1).maybeSingle();
  if (byName) return mapRecord<F>(byName as AccessibilityRow);

  return null;
}

function mapRecord<F extends Record<string, boolean | undefined>>(
  row: AccessibilityRow,
): AccessibilityInfo<F> {
  const provider = row.external_provider;
  const source: AccessibilityInfo<F>["source"] =
    provider === "tur4all" ||
    provider === "hotelbeds_content" ||
    provider === "manual" ||
    provider === "derived"
      ? provider
      : provider
        ? "manual"
        : "unknown";

  return {
    features: (row.features ?? {}) as F,
    source,
    sourceUrl: row.source_url ?? undefined,
    verified: Boolean(row.verified),
    verifiedAt: row.verified_at ?? undefined,
    notes: row.notes ?? undefined,
  };
}

type FacilityLike = { facilityCode?: number | string; code?: number | string };

/**
 * Fallback: deriva flags de facilities Hotelbeds Content API.
 * Códigos ilustrativos — ajustar con el dataset real.
 */
export function deriveFromHotelbedsContent(hotelData: {
  facilities?: FacilityLike[];
  content?: { facilities?: FacilityLike[] };
}): HotelFeatures {
  const facilities =
    hotelData.facilities ?? hotelData.content?.facilities ?? [];
  const has = (code: number | string) =>
    facilities.some(
      (f) =>
        String(f.facilityCode ?? f.code ?? "") === String(code),
    );

  return {
    elevator: has(70) || has(72),
    ramp_entrance: has(255),
    accessible_room: has(255) || has(256),
    accessible_bathroom: has(257),
    accessible_parking: has(228),
    service_dog_allowed: has(180),
  };
}

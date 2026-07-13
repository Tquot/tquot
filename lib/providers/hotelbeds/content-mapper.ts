import type { HotelFacility } from "./content-types";

/**
 * Agrupa facilities por categoría amigable para mostrar al usuario.
 */
export interface GroupedFacilities {
  rooms: string[];
  building: string[];
  food: string[];
  wellness: string[];
  business: string[];
  family: string[];
  beach: string[];
  outdoor: string[];
  other: string[];
}

const FACILITY_GROUPS: Record<number, keyof GroupedFacilities> = {
  10: "rooms",
  20: "rooms",
  60: "food",
  70: "building",
  80: "business",
  90: "family",
  100: "wellness",
  110: "beach",
  120: "outdoor",
};

/** Debug: inspect raw Hotelbeds Content API hotel payload. */
export function logRawHotelContentPayload(hotelData: Record<string, unknown>) {
  console.log("[content-mapper] raw hotel data keys:", Object.keys(hotelData));
  console.log(
    "[content-mapper] facilities:",
    Array.isArray(hotelData.facilities) ? hotelData.facilities.length : undefined,
  );
  console.log("[content-mapper] description:", !!hotelData.description);
}

export function groupFacilities(facilities: HotelFacility[]): GroupedFacilities {
  const empty: GroupedFacilities = {
    rooms: [],
    building: [],
    food: [],
    wellness: [],
    business: [],
    family: [],
    beach: [],
    outdoor: [],
    other: [],
  };

  for (const f of facilities) {
    const target = FACILITY_GROUPS[f.group] ?? "other";
    const label = formatFacility(f);
    if (!empty[target].includes(label)) empty[target].push(label);
  }

  return empty;
}

function formatFacility(f: HotelFacility): string {
  if (f.number && f.number > 1) {
    return `${f.description} (${f.number})`;
  }
  return f.description;
}

export function flatFacilities(facilities: HotelFacility[]): string[] {
  return facilities.map(formatFacility);
}

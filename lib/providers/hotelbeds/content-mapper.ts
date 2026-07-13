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

/** Hotelbeds Content API facilityGroupCode → UI bucket. */
const FACILITY_GROUPS: Record<number, keyof GroupedFacilities> = {
  10: "building", // Location
  60: "rooms", // Room facilities (Standard room)
  61: "rooms", // Room Distribution
  62: "rooms", // Room distribution Alternative
  70: "building", // Facilities
  71: "food", // Catering
  73: "outdoor", // Entertainment
  74: "wellness", // Health
  80: "business", // Business
  85: "other", // Things to keep in mind
  90: "outdoor", // Sports
  91: "wellness", // Healthy & Safety
};

/** Debug: inspect raw Hotelbeds Content API hotel payload. */
export function logRawHotelContentPayload(hotelData: Record<string, unknown>) {
  const facilities = Array.isArray(hotelData.facilities)
    ? hotelData.facilities
    : undefined;
  console.log("[content-mapper] raw hotel data keys:", Object.keys(hotelData));
  console.log("[content-mapper] facilities count:", facilities?.length);
  console.log(
    "[content-mapper] first 3 facilities:",
    JSON.stringify(facilities?.slice(0, 3)),
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

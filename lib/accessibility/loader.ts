import type { HotelOption } from "@/lib/hotels/search-booking";
import {
  deriveFromHotelbedsContent,
  fetchAccessibilityRecord,
} from "./tur4all-connector";
import type { AccessibilityInfo, HotelFeatures } from "./types";

export async function loadHotelAccessibility(input: {
  hotelbedsCode?: string;
  name: string;
  destination?: string;
  hotelbedsContent?: {
    facilities?: Array<{ facilityCode?: number | string; code?: number | string }>;
  };
}): Promise<AccessibilityInfo<HotelFeatures> | undefined> {
  try {
    const record = await fetchAccessibilityRecord<HotelFeatures>({
      hotelbedsCode: input.hotelbedsCode,
      name: input.name,
      destination: input.destination,
      itemType: "hotel",
    });
    if (record) return record;
  } catch (error) {
    console.error("[accessibility] fetchAccessibilityRecord failed:", error);
  }

  if (input.hotelbedsContent) {
    const features = deriveFromHotelbedsContent(input.hotelbedsContent);
    const hasAny = Object.values(features).some(Boolean);
    if (!hasAny) return undefined;
    return {
      features,
      source: "derived",
      verified: false,
    };
  }

  return undefined;
}

/**
 * Adjunta accessibility a cada HotelOption tras el enrich de Content API.
 */
export async function enrichHotelsWithAccessibility(
  hotels: HotelOption[],
  destination?: string,
): Promise<HotelOption[]> {
  return Promise.all(
    hotels.map(async (hotel) => {
      const accessibility = await loadHotelAccessibility({
        hotelbedsCode: hotel.hotelCode ?? hotel.propertyId,
        name: hotel.name,
        destination,
        hotelbedsContent: hotel.content
          ? { facilities: hotel.content.facilities }
          : undefined,
      });
      if (!accessibility) return hotel;
      return { ...hotel, accessibility };
    }),
  );
}

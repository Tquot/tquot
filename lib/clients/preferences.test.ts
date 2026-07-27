import { describe, expect, it } from "vitest";
import {
  inferPreferencesFromSources,
  type PreferenceSource,
} from "@/lib/clients/preferences";

function source(
  partial: Partial<PreferenceSource> & Pick<PreferenceSource, "destination">,
): PreferenceSource {
  return {
    adults: 2,
    children: 0,
    totalPrice: 2000,
    currency: "EUR",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("inferPreferencesFromSources", () => {
  it("returns empty defaults for empty history", () => {
    const prefs = inferPreferencesFromSources([]);
    expect(prefs.frequentDestinations).toEqual([]);
    expect(prefs.preferredHotelStyles).toEqual([]);
    expect(prefs.preferredThemes).toEqual([]);
  });

  it("infers destination, tier and group size from repeated trips", () => {
    const history = [
      source({
        destination: "Roma",
        hotelTier: "premium",
        adults: 2,
        children: 1,
        totalPrice: 3000,
      }),
      source({
        destination: "Roma",
        hotelTier: "premium",
        adults: 2,
        children: 0,
        totalPrice: 2500,
      }),
      source({
        destination: "París",
        hotelTier: "mid",
        adults: 2,
        children: 1,
        totalPrice: 1800,
      }),
    ];

    const prefs = inferPreferencesFromSources(history);
    expect(prefs.preferredHotelTier).toBe("premium");
    expect(prefs.frequentDestinations[0]?.destination).toBe("Roma");
    expect(prefs.frequentDestinations[0]?.count).toBe(2);
    expect(prefs.typicalGroupSize).toBe(3);
    expect(prefs.averageBudgetEur).toBe(Math.round((3000 + 2500 + 1800) / 3));
  });
});

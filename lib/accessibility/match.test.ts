import { describe, expect, it } from "vitest";
import {
  matchesHotel,
  profileFromAccessibilityTokens,
} from "@/lib/accessibility/match";
import type { AccessibilityInfo, HotelFeatures } from "@/lib/accessibility/types";

describe("matchesHotel", () => {
  const info: AccessibilityInfo<HotelFeatures> = {
    features: {
      accessible_room: true,
      accessible_bathroom: true,
      elevator: true,
    },
    source: "manual",
    verified: true,
  };

  it("matches when all required features are present", () => {
    const result = matchesHotel(
      {
        required: {
          hotel: ["accessible_room", "elevator"],
          experience: [],
          transfer: [],
        },
        preferred: { hotel: ["accessible_bathroom"], experience: [], transfer: [] },
      },
      info,
    );
    expect(result.matches).toBe(true);
    expect(result.score).toBe(100);
    expect(result.requiredMissing).toEqual([]);
  });

  it("fails when a required feature is missing", () => {
    const result = matchesHotel(
      {
        required: {
          hotel: ["accessible_room", "roll_in_shower"],
          experience: [],
          transfer: [],
        },
        preferred: { hotel: [], experience: [], transfer: [] },
      },
      info,
    );
    expect(result.matches).toBe(false);
    expect(result.requiredMissing).toContain("roll_in_shower");
    expect(result.score).toBe(0);
  });

  it("allows missing data only when nothing is required", () => {
    const empty = matchesHotel(
      {
        required: { hotel: [], experience: [], transfer: [] },
        preferred: { hotel: [], experience: [], transfer: [] },
      },
      undefined,
    );
    expect(empty.matches).toBe(true);
    expect(empty.score).toBe(50);

    const strict = matchesHotel(
      {
        required: { hotel: ["elevator"], experience: [], transfer: [] },
        preferred: { hotel: [], experience: [], transfer: [] },
      },
      undefined,
    );
    expect(strict.matches).toBe(false);
    expect(strict.score).toBe(0);
  });
});

describe("profileFromAccessibilityTokens", () => {
  it("infers a mobility profile from generic tokens", () => {
    const profile = profileFromAccessibilityTokens(["wheelchair_accessible"]);
    expect(profile?.required.hotel).toContain("accessible_room");
    expect(profile?.required.transfer).toContain("wheelchair_accessible_vehicle");
  });
});

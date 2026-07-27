import type {
  AccessibilityInfo,
  AccessibilityProfile,
  ExperienceFeatures,
  HotelFeatures,
  TransferFeatures,
} from "./types";

export interface MatchResult {
  requiredMissing: string[];
  preferredMissing: string[];
  matches: boolean;
  score: number;
}

export function matchesHotel(
  profile: AccessibilityProfile | undefined,
  info: AccessibilityInfo<HotelFeatures> | undefined,
): MatchResult {
  return matchGeneric(
    profile?.required.hotel ?? [],
    profile?.preferred.hotel ?? [],
    info?.features,
  );
}

export function matchesExperience(
  profile: AccessibilityProfile | undefined,
  info: AccessibilityInfo<ExperienceFeatures> | undefined,
): MatchResult {
  return matchGeneric(
    profile?.required.experience ?? [],
    profile?.preferred.experience ?? [],
    info?.features,
  );
}

export function matchesTransfer(
  profile: AccessibilityProfile | undefined,
  info: AccessibilityInfo<TransferFeatures> | undefined,
): MatchResult {
  return matchGeneric(
    profile?.required.transfer ?? [],
    profile?.preferred.transfer ?? [],
    info?.features,
  );
}

function matchGeneric(
  required: string[],
  preferred: string[],
  features?: Record<string, boolean | undefined>,
): MatchResult {
  if (!features) {
    return {
      requiredMissing: required,
      preferredMissing: preferred,
      matches: required.length === 0,
      score: required.length === 0 ? 50 : 0,
    };
  }

  const requiredMissing = required.filter((f) => !features[f]);
  const preferredMissing = preferred.filter((f) => !features[f]);

  if (requiredMissing.length > 0) {
    return { requiredMissing, preferredMissing, matches: false, score: 0 };
  }

  const totalPreferred = preferred.length;
  const preferredHits = totalPreferred - preferredMissing.length;
  const preferredScore =
    totalPreferred === 0 ? 100 : 50 + (50 * preferredHits) / totalPreferred;

  return {
    requiredMissing: [],
    preferredMissing,
    matches: true,
    score: Math.round(preferredScore),
  };
}

/** Generic wheelchair / reduced-mobility profile when language is generic. */
export function defaultMobilityProfile(): AccessibilityProfile {
  return {
    required: {
      hotel: ["accessible_room", "accessible_bathroom", "elevator"],
      experience: ["wheelchair_accessible"],
      transfer: ["wheelchair_accessible_vehicle"],
    },
    preferred: { hotel: [], experience: [], transfer: [] },
  };
}

/**
 * Builds a profile from legacy free-text accessibility tokens (v2 string[]).
 */
export function profileFromAccessibilityTokens(
  tokens: string[],
): AccessibilityProfile | undefined {
  if (tokens.length === 0) return undefined;

  const normalized = tokens.map((t) => t.toLowerCase());
  const hasGeneric = normalized.some((t) =>
    [
      "accesible",
      "accessible",
      "wheelchair_accessible",
      "limited_mobility",
      "movilidad_reducida",
      "silla_de_ruedas",
    ].includes(t),
  );

  if (hasGeneric) return defaultMobilityProfile();

  const hotel: string[] = [];
  const experience: string[] = [];
  const transfer: string[] = [];

  for (const t of normalized) {
    if (
      ["accessible_room", "accessible_bathroom", "elevator", "roll_in_shower"].includes(
        t,
      )
    ) {
      hotel.push(t);
    } else if (
      ["wheelchair_accessible", "reduced_mobility_friendly", "sign_language_guide"].includes(
        t,
      )
    ) {
      experience.push(t);
    } else if (
      ["wheelchair_accessible_vehicle", "wheelchair_lift", "guide_dog", "service_dog_allowed"].includes(
        t,
      )
    ) {
      if (t === "guide_dog") {
        hotel.push("service_dog_allowed");
        experience.push("service_dog_allowed");
        transfer.push("service_dog_allowed");
      } else {
        transfer.push(t);
      }
    }
  }

  if (hotel.length + experience.length + transfer.length === 0) {
    return defaultMobilityProfile();
  }

  return {
    required: { hotel, experience, transfer },
    preferred: { hotel: [], experience: [], transfer: [] },
  };
}

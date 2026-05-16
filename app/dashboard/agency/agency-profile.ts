export type AgencyProfile = {
  agencyName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logoBase64: string;
};

export const AGENCY_PROFILE_STORAGE_KEY = "tquot-agency-profile";

export const DEFAULT_AGENCY_PROFILE: AgencyProfile = {
  agencyName: "TQuot Travel Agency",
  email: "hello@tquot.io",
  phone: "",
  address: "",
  website: "tquot.io",
  logoBase64: "",
};

export function readAgencyProfile(): AgencyProfile {
  if (typeof window === "undefined") {
    return DEFAULT_AGENCY_PROFILE;
  }

  const stored = localStorage.getItem(AGENCY_PROFILE_STORAGE_KEY);
  if (!stored) {
    return DEFAULT_AGENCY_PROFILE;
  }

  try {
    return {
      ...DEFAULT_AGENCY_PROFILE,
      ...(JSON.parse(stored) as Partial<AgencyProfile>),
    };
  } catch {
    return DEFAULT_AGENCY_PROFILE;
  }
}

export function writeAgencyProfile(profile: AgencyProfile) {
  localStorage.setItem(AGENCY_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

/**
 * Branding DTO for public quote shares.
 * Mapped from `agencies` (no separate agency_branding table in this repo).
 */
export interface AgencyBranding {
  primaryColor: string;
  logoUrl?: string;
  agencyLegalName?: string;
  agencyEmail?: string;
  agencyPhone?: string;
  agencyWebsite?: string;
}

export type AgencyBrandingRow = {
  name?: string | null;
  logo_url?: string | null;
  legal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
};

export function mapAgencyBranding(row: AgencyBrandingRow): AgencyBranding {
  return {
    primaryColor: "#0d9488",
    logoUrl: row.logo_url ?? undefined,
    agencyLegalName: row.legal_name ?? row.name ?? undefined,
    agencyEmail: row.email ?? undefined,
    agencyPhone: row.phone ?? undefined,
    agencyWebsite: row.website ?? undefined,
  };
}

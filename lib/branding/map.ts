import type { AgencyBranding } from "./types";

type AgencyRow = {
  id?: string;
  name?: string | null;
  logo_url?: string | null;
  legal_name?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
};

type BrandingRow = {
  primary_color?: string | null;
  secondary_color?: string | null;
  text_color?: string | null;
  accent_color?: string | null;
  logo_url?: string | null;
  font_family?: string | null;
  cover_image_url?: string | null;
  agency_legal_name?: string | null;
  agency_phone?: string | null;
  agency_email?: string | null;
  agency_website?: string | null;
  agency_address?: string | null;
  pdf_footer_text?: string | null;
};

export function mapAgencyBranding(
  agency: AgencyRow,
  branding?: BrandingRow | null,
  agencyId = "",
): AgencyBranding {
  return {
    agencyId,
    primaryColor: branding?.primary_color ?? "#1e40af",
    secondaryColor: branding?.secondary_color ?? "#0ea5e9",
    textColor: branding?.text_color ?? "#0f172a",
    accentColor: branding?.accent_color ?? "#f59e0b",
    logoUrl: branding?.logo_url ?? agency.logo_url ?? undefined,
    fontFamily: branding?.font_family ?? "Helvetica",
    coverImageUrl: branding?.cover_image_url ?? undefined,
    agencyLegalName:
      branding?.agency_legal_name ??
      agency.legal_name ??
      agency.name ??
      undefined,
    agencyPhone: branding?.agency_phone ?? agency.phone ?? undefined,
    agencyEmail: branding?.agency_email ?? agency.email ?? undefined,
    agencyWebsite: branding?.agency_website ?? agency.website ?? undefined,
    agencyAddress: branding?.agency_address ?? agency.address ?? undefined,
    pdfFooterText: branding?.pdf_footer_text ?? undefined,
  };
}

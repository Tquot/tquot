import "server-only";

import { getCurrentAgencyId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AgencyBranding } from "./types";

const DEFAULTS: Omit<AgencyBranding, "agencyId"> = {
  primaryColor: "#1e40af",
  secondaryColor: "#0ea5e9",
  textColor: "#0f172a",
  accentColor: "#f59e0b",
  fontFamily: "Helvetica",
};

export async function loadBranding(agencyId?: string): Promise<AgencyBranding> {
  const supabase = await createServerSupabaseClient();
  const resolvedAgencyId = agencyId ?? (await getCurrentAgencyId());
  if (!resolvedAgencyId) throw new Error("no_agency_context");

  const { data: brandingRow } = await supabase
    .from("agency_branding")
    .select("*")
    .eq("agency_id", resolvedAgencyId)
    .maybeSingle();

  const { data: agencyRow } = await supabase
    .from("agencies")
    .select("name, legal_name, phone, email, website, address, logo_url")
    .eq("id", resolvedAgencyId)
    .maybeSingle();

  if (!brandingRow) {
    return {
      agencyId: resolvedAgencyId,
      ...DEFAULTS,
      logoUrl: agencyRow?.logo_url ?? undefined,
      agencyLegalName: agencyRow?.legal_name ?? agencyRow?.name ?? undefined,
      agencyPhone: agencyRow?.phone ?? undefined,
      agencyEmail: agencyRow?.email ?? undefined,
      agencyWebsite: agencyRow?.website ?? undefined,
      agencyAddress: agencyRow?.address ?? undefined,
    };
  }

  return {
    agencyId: resolvedAgencyId,
    primaryColor: brandingRow.primary_color ?? DEFAULTS.primaryColor,
    secondaryColor: brandingRow.secondary_color ?? DEFAULTS.secondaryColor,
    textColor: brandingRow.text_color ?? DEFAULTS.textColor,
    accentColor: brandingRow.accent_color ?? DEFAULTS.accentColor,
    logoUrl: brandingRow.logo_url ?? agencyRow?.logo_url ?? undefined,
    fontFamily: brandingRow.font_family ?? DEFAULTS.fontFamily,
    coverImageUrl: brandingRow.cover_image_url ?? undefined,
    agencyLegalName:
      brandingRow.agency_legal_name ??
      agencyRow?.legal_name ??
      agencyRow?.name ??
      undefined,
    agencyPhone: brandingRow.agency_phone ?? agencyRow?.phone ?? undefined,
    agencyEmail: brandingRow.agency_email ?? agencyRow?.email ?? undefined,
    agencyWebsite: brandingRow.agency_website ?? agencyRow?.website ?? undefined,
    agencyAddress: brandingRow.agency_address ?? agencyRow?.address ?? undefined,
    pdfFooterText: brandingRow.pdf_footer_text ?? undefined,
  };
}

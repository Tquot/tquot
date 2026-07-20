"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAgencyId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AgencyBranding } from "./types";

export async function updateBranding(
  patch: Partial<Omit<AgencyBranding, "agencyId">>,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const agencyId = await getCurrentAgencyId();
  if (!agencyId) throw new Error("no_agency_context");

  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const map: Record<string, string> = {
    primaryColor: "primary_color",
    secondaryColor: "secondary_color",
    textColor: "text_color",
    accentColor: "accent_color",
    logoUrl: "logo_url",
    fontFamily: "font_family",
    coverImageUrl: "cover_image_url",
    agencyLegalName: "agency_legal_name",
    agencyPhone: "agency_phone",
    agencyEmail: "agency_email",
    agencyWebsite: "agency_website",
    agencyAddress: "agency_address",
    pdfFooterText: "pdf_footer_text",
  };

  for (const [key, dbCol] of Object.entries(map)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value !== undefined) dbPatch[dbCol] = value;
  }

  const { error } = await supabase
    .from("agency_branding")
    .upsert({ agency_id: agencyId, ...dbPatch }, { onConflict: "agency_id" });

  if (error) throw error;
  revalidatePath("/dashboard/settings/branding");
}

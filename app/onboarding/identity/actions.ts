"use server";

import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { markStepComplete } from "@/lib/onboarding/progress";

export async function saveIdentityAction(data: {
  name: string;
  primaryColor: string;
  accentColor: string;
  accessibilityDefault: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await getAuthenticatedUserAndAgency();
  if ("response" in auth) {
    return { ok: false, error: "not_authenticated" };
  }

  if (!data.name.trim()) {
    return { ok: false, error: "agency_name_required" };
  }

  const supabase = await createServerSupabaseClient();

  const { error: agencyError } = await supabase
    .from("agencies")
    .update({
      name: data.name.trim(),
      legal_name: data.name.trim(),
      accessibility_default: data.accessibilityDefault,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.agencyId);

  if (agencyError) {
    return { ok: false, error: agencyError.message };
  }

  const { error: brandingError } = await supabase.from("agency_branding").upsert(
    {
      agency_id: auth.agencyId,
      primary_color: data.primaryColor,
      accent_color: data.accentColor,
      secondary_color: data.accentColor,
      text_color: "#0F1419",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "agency_id" },
  );

  if (brandingError) {
    return { ok: false, error: brandingError.message };
  }

  await markStepComplete({ step: "identity" });
  return { ok: true };
}

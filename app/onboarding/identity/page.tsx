import { IdentityFormClient } from "./IdentityFormClient";
import { getCurrentAgencyId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function IdentityPage() {
  const agencyId = await getCurrentAgencyId();
  const supabase = await createServerSupabaseClient();

  let name = "";
  let primary = "#1B2436";
  let accent = "#B89446";
  let accessibilityDefault = false;

  if (agencyId) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("name, accessibility_default")
      .eq("id", agencyId)
      .maybeSingle();
    name = agency?.name ?? "";
    accessibilityDefault = Boolean(agency?.accessibility_default);

    const { data: branding } = await supabase
      .from("agency_branding")
      .select("primary_color, accent_color")
      .eq("agency_id", agencyId)
      .maybeSingle();
    primary = branding?.primary_color ?? primary;
    accent = branding?.accent_color ?? accent;
  }

  return (
    <IdentityFormClient
      initialName={name}
      initialPrimary={primary}
      initialAccent={accent}
      initialAccessibilityDefault={accessibilityDefault}
    />
  );
}

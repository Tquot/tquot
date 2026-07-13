import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentAgencyId } from "@/lib/auth";

export async function loadAgencyCurrency(): Promise<string> {
  try {
    const agencyId = await getCurrentAgencyId();
    if (!agencyId) return "EUR";

    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("agencies")
      .select("base_currency")
      .eq("id", agencyId)
      .maybeSingle();

    const code = (data?.base_currency as string | null)?.toUpperCase();
    return code && code.length === 3 ? code : "EUR";
  } catch {
    return "EUR";
  }
}

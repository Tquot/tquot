import { getAuthenticatedUser } from "@/app/api/parser/_auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentAgencyId(): Promise<string | null> {
  const auth = await getAuthenticatedUser();
  if (auth.response) return null;

  const supabase = await createServerSupabaseClient();
  const { data: agency, error } = await supabase
    .from("agencies")
    .select("id")
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  if (error || !agency) return null;
  return agency.id;
}

export async function getCurrentUserId(): Promise<string | null> {
  const auth = await getAuthenticatedUser();
  if (auth.response) return null;
  return auth.user.id;
}

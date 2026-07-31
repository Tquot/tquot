"use server";

import { getAuthenticatedUser } from "@/app/api/parser/_auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Ensure the signed-in user has an agencies row (onboarding entry). */
export async function ensureAgencyForUser(): Promise<string | null> {
  const auth = await getAuthenticatedUser();
  if (auth.response || !auth.user) return null;

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("agencies")
    .select("id")
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const displayName =
    (auth.user.user_metadata?.full_name as string | undefined) ||
    auth.user.email?.split("@")[0] ||
    "Mi agencia";

  const { data: created, error } = await supabase
    .from("agencies")
    .insert({
      owner_id: auth.user.id,
      name: displayName,
      email: auth.user.email ?? null,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[ensureAgencyForUser]", error);
    return null;
  }

  await supabase.from("agency_members").upsert({
    agency_id: created.id,
    user_id: auth.user.id,
    role: "owner",
  });

  return created.id;
}

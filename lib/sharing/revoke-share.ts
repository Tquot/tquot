"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function revokeShare(token: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase
    .from("quote_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token", token);
}

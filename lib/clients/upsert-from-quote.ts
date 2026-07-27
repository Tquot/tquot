"use server";

import { getCurrentUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface UpsertInput {
  email: string;
  name?: string;
  phone?: string;
}

interface UpsertResult {
  clientId: string;
  created: boolean;
}

/**
 * Busca un cliente por email (case-insensitive) del usuario actual.
 * Si existe, devuelve su id. Si no, lo crea.
 */
export async function upsertClientFromQuote(
  input: UpsertInput,
): Promise<UpsertResult> {
  const supabase = await createServerSupabaseClient();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("no_agency_context");

  const emailLower = input.email.toLowerCase().trim();
  if (!emailLower) throw new Error("email_required");

  const { data: existing, error: selErr } = await supabase
    .from("clients")
    .select("id, full_name, phone")
    .eq("user_id", userId)
    .ilike("email", emailLower)
    .maybeSingle();

  if (selErr) throw new Error(`client_lookup_failed: ${selErr.message}`);

  if (existing) {
    const patch: Record<string, string> = {};
    if (input.name?.trim() && (!existing.full_name || existing.full_name === "(sin nombre)")) {
      patch.full_name = input.name.trim();
    }
    if (input.phone?.trim() && !existing.phone) {
      patch.phone = input.phone.trim();
    }
    if (Object.keys(patch).length > 0) {
      await supabase.from("clients").update(patch).eq("id", existing.id);
    }
    return { clientId: existing.id, created: false };
  }

  const { data: created, error } = await supabase
    .from("clients")
    .insert({
      user_id: userId,
      email: emailLower,
      full_name: input.name?.trim() || emailLower.split("@")[0] || "(sin nombre)",
      phone: input.phone?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`client_create_failed: ${error?.message}`);
  }
  return { clientId: created.id, created: true };
}

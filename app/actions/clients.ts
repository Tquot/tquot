"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ClientInputSchema = z.object({
  name: z.string().trim().min(1, "name_required"),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export async function upsertClient(input: unknown): Promise<{ id: string }> {
  const parsed = ClientInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`invalid_client_input: ${parsed.error.message}`);
  }

  const supabase = await createServerSupabaseClient();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("no_agency_context");

  const data = parsed.data;
  const normalizedEmail = data.email?.toLowerCase().trim() || null;

  if (normalizedEmail) {
    const { data: existing, error: selErr } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", userId)
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (selErr) throw new Error(`client_lookup_failed: ${selErr.message}`);
    if (existing) {
      await supabase
        .from("clients")
        .update({
          full_name: data.name,
          phone: data.phone ?? null,
        })
        .eq("id", existing.id);
      return { id: existing.id };
    }
  }

  const { data: inserted, error: insErr } = await supabase
    .from("clients")
    .insert({
      user_id: userId,
      full_name: data.name,
      email: normalizedEmail,
      phone: data.phone ?? null,
    })
    .select("id")
    .single();

  if (insErr) throw new Error(`client_insert_failed: ${insErr.message}`);
  return { id: inserted.id };
}

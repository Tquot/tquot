"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Quote } from "@/lib/quote-engine/types";
import type { ChangeKind } from "./types";

interface CreateVersionInput {
  quoteId: string;
  /** Versión PREVIA (la que se va a sobrescribir). */
  snapshot: Quote;
  changeKind: ChangeKind;
  changeSummary?: string;
}

export async function createQuoteVersion(
  input: CreateVersionInput,
): Promise<number> {
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("quote_versions")
    .select("version_number")
    .eq("quote_id", input.quoteId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (existing?.version_number ?? 0) + 1;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("quote_versions").insert({
    quote_id: input.quoteId,
    version_number: nextVersion,
    snapshot: input.snapshot,
    change_summary: input.changeSummary ?? null,
    change_kind: input.changeKind,
    created_by: user?.id ?? null,
  });

  if (error) throw new Error(`version_create_failed: ${error.message}`);
  return nextVersion;
}

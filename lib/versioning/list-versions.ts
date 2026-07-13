import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ChangeKind, QuoteVersion } from "./types";

export async function listVersions(quoteId: string): Promise<QuoteVersion[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("quote_versions")
    .select("*")
    .eq("quote_id", quoteId)
    .order("version_number", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    quoteId: row.quote_id as string,
    versionNumber: row.version_number as number,
    snapshot: row.snapshot,
    changeSummary: (row.change_summary as string | null) ?? undefined,
    changeKind: row.change_kind as ChangeKind,
    createdAt: row.created_at as string,
    createdBy: (row.created_by as string | null) ?? undefined,
  }));
}

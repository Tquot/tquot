"use server";

/**
 * Helpers to version + update quotes.snapshot after in-memory mutations
 * (board change, price refresh) when a saved quoteId is available.
 */

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Quote } from "@/lib/quote-engine/types";
import { createQuoteVersion } from "@/lib/versioning/snapshot-version";
import type { ChangeKind } from "@/lib/versioning/types";

export async function persistQuoteSnapshotMutation(input: {
  quoteId: string;
  newSnapshot: Quote;
  changeKind: Extract<ChangeKind, "board_change" | "snapshot_refresh" | "manual_edit">;
  changeSummary: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { data: current, error: loadError } = await supabase
    .from("quotes")
    .select("snapshot")
    .eq("id", input.quoteId)
    .maybeSingle();

  if (loadError || !current) {
    return { success: false, error: "quote_not_found" };
  }

  const previous = (current.snapshot as Quote | null) ?? input.newSnapshot;

  await createQuoteVersion({
    quoteId: input.quoteId,
    snapshot: previous,
    changeKind: input.changeKind,
    changeSummary: input.changeSummary,
  });

  const { error: updateError } = await supabase
    .from("quotes")
    .update({
      snapshot: input.newSnapshot,
      total_net_cost: input.newSnapshot.pricing.baseTotal,
      total_margin: input.newSnapshot.pricing.margin,
      total_public_price: input.newSnapshot.pricing.finalTotal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.quoteId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

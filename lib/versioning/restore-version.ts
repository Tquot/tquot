"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Quote } from "@/lib/quote-engine/types";
import { createQuoteVersion } from "./snapshot-version";

interface RestoreInput {
  quoteId: string;
  versionNumber: number;
}

export async function restoreVersion(
  input: RestoreInput,
): Promise<{ success: boolean }> {
  const supabase = await createServerSupabaseClient();

  const { data: version } = await supabase
    .from("quote_versions")
    .select("snapshot")
    .eq("quote_id", input.quoteId)
    .eq("version_number", input.versionNumber)
    .single();

  if (!version) return { success: false };

  const { data: current } = await supabase
    .from("quotes")
    .select("snapshot")
    .eq("id", input.quoteId)
    .single();

  if (!current?.snapshot) return { success: false };

  await createQuoteVersion({
    quoteId: input.quoteId,
    snapshot: current.snapshot as Quote,
    changeKind: "manual_edit",
    changeSummary: `Pre-restauración a versión ${input.versionNumber}`,
  });

  const restored = version.snapshot as Quote;
  const { error } = await supabase
    .from("quotes")
    .update({
      snapshot: restored,
      total_net_cost: restored.pricing?.baseTotal ?? undefined,
      total_margin: restored.pricing?.margin ?? undefined,
      total_public_price: restored.pricing?.finalTotal ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.quoteId);

  if (error) return { success: false };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/new-quote`);
  return { success: true };
}

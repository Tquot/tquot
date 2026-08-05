"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canTransition, type QuoteStatus } from "./transitions";
import { invalidatePattern } from "@/lib/cache";

interface UpdateStatusInput {
  quoteId: string;
  newStatus: QuoteStatus;
  note?: string;
}

export async function updateQuoteStatus(input: UpdateStatusInput): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();

  const { data: current } = await supabase
    .from("quotes")
    .select("status, agency_id")
    .eq("id", input.quoteId)
    .single();

  if (!current) return { success: false, error: "quote_not_found" };

  const fromStatus = current.status as QuoteStatus;

  if (!canTransition(fromStatus, input.newStatus)) {
    return {
      success: false,
      error: `invalid_transition: ${fromStatus} → ${input.newStatus}`,
    };
  }

  const timestampField: Partial<Record<QuoteStatus, string>> = {
    sent: "sent_at",
    confirmed: "confirmed_at",
    accepted: "accepted_at",
    in_progress: "in_progress_at",
    reserved: "reserved_at",
    cancelled: "cancelled_at",
  };

  const update: Record<string, unknown> = { status: input.newStatus };
  const tsField = timestampField[input.newStatus];
  if (tsField) update[tsField] = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("quotes")
    .update(update)
    .eq("id", input.quoteId);

  if (updateError) return { success: false, error: updateError.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("quote_status_audit").insert({
    quote_id: input.quoteId,
    from_status: fromStatus,
    to_status: input.newStatus,
    note: input.note ?? null,
    changed_by: user?.id ?? null,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/new-quote`);
  revalidatePath("/analytics");
  if (current?.agency_id) {
    await invalidatePattern(`analytics:${current.agency_id}:*`);
  }
  return { success: true };
}

import "server-only";

import { getCurrentAgencyId, getCurrentUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import type { QuoteStatus } from "@/lib/quote-status/transitions";

export interface QuoteResumePayload {
  quoteId: string;
  status: QuoteStatus;
  quote: Quote;
  tripInput: ParsedTripInput;
  client?: { id: string; name: string; email?: string };
}

type QuoteRow = {
  id: string;
  status: string | null;
  snapshot: Quote | null;
  parsed: ParsedTripInput | null;
  client_id: string | null;
  user_id: string;
  agency_id: string | null;
  client?:
    | {
        id?: string;
        full_name?: string | null;
        email?: string | null;
      }
    | Array<{
        id?: string;
        full_name?: string | null;
        email?: string | null;
      }>
    | null;
};

export async function loadQuoteForResume(
  quoteId: string,
): Promise<QuoteResumePayload | null> {
  const supabase = await createServerSupabaseClient();
  const [agencyId, userId] = await Promise.all([
    getCurrentAgencyId(),
    getCurrentUserId(),
  ]);

  if (!userId) return null;

  let query = supabase
    .from("quotes")
    .select(
      "id, status, snapshot, parsed, client_id, user_id, agency_id, client:clients(id, full_name, email)",
    )
    .eq("id", quoteId);

  query = agencyId
    ? query.eq("agency_id", agencyId)
    : query.eq("user_id", userId);

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  const row = data as QuoteRow;
  if (!row.snapshot || !row.parsed) return null;

  const clientRow = Array.isArray(row.client) ? row.client[0] : row.client;
  const client =
    clientRow?.id || row.client_id
      ? {
          id: String(clientRow?.id ?? row.client_id),
          name: clientRow?.full_name?.trim() || "Cliente",
          email: clientRow?.email?.trim() || undefined,
        }
      : undefined;

  return {
    quoteId: row.id,
    status: normalizeStatus(row.status),
    quote: row.snapshot,
    tripInput: row.parsed,
    client,
  };
}

function normalizeStatus(status: string | null): QuoteStatus {
  switch (status) {
    case "sent":
    case "confirmed":
    case "accepted":
    case "in_progress":
    case "reserved":
    case "cancelled":
    case "expired":
      return status;
    default:
      return "draft";
  }
}

import "server-only";

import { getCurrentAgencyId, getCurrentUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RecentQuote } from "@/components/dashboard/RecentQuotesStrip";
import type { QuoteStatus } from "@/lib/quote-status/transitions";

type QuoteSnapshot = {
  pricing?: {
    finalTotal?: number;
    currency?: string;
  };
  hotels?: Array<{
    imageUrl?: string;
    images?: string[];
    destination?: string;
    name?: string;
  }>;
  summary?: {
    destination?: string;
  };
};

interface ListRecentQuotesOptions {
  limit?: number;
  status?: QuoteStatus;
}

type QuoteRow = {
  id: string;
  destination: string | null;
  total_public_price: number | null;
  currency: string | null;
  status: string | null;
  created_at: string;
  snapshot: QuoteSnapshot | null;
  client?:
    | {
        full_name?: string | null;
      }
    | Array<{
        full_name?: string | null;
      }>
    | null;
};

export async function listRecentQuotes(
  options: ListRecentQuotesOptions = {},
): Promise<RecentQuote[]> {
  const supabase = await createServerSupabaseClient();
  const [agencyId, userId] = await Promise.all([
    getCurrentAgencyId(),
    getCurrentUserId(),
  ]);

  if (!userId) return [];

  let query = supabase
    .from("quotes")
    .select(
      "id, destination, total_public_price, currency, status, created_at, snapshot, client:clients(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 12);

  query = agencyId
    ? query.eq("agency_id", agencyId)
    : query.eq("user_id", userId);

  if (options.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as QuoteRow[]).map(mapRecentQuote);
}

function mapRecentQuote(row: QuoteRow): RecentQuote {
  const snapshot = row.snapshot ?? {};
  const hotel = snapshot.hotels?.[0];
  const destination =
    hotel?.destination ??
    snapshot.summary?.destination ??
    row.destination ??
    "Destino pendiente";
  const totalPrice = Number(
    snapshot.pricing?.finalTotal ?? row.total_public_price ?? 0,
  );
  const currency = snapshot.pricing?.currency ?? row.currency ?? "EUR";
  const imageUrl = hotel?.imageUrl ?? hotel?.images?.[0];
  const client =
    Array.isArray(row.client) ? row.client[0] : row.client;

  return {
    id: row.id,
    destination,
    clientName: client?.full_name?.trim() || "Cliente sin nombre",
    imageUrl,
    totalPrice,
    currency,
    status: normalizeStatus(row.status),
    createdAt: row.created_at,
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

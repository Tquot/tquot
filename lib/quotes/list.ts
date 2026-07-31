import "server-only";

import { getCurrentAgencyId, getCurrentUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  STATUS_LABELS,
  type QuoteStatus,
} from "@/lib/quote-status/transitions";

export interface QuoteListItem {
  id: string;
  reference: string;
  destination: string;
  departureDate: string | null;
  returnDate: string | null;
  adults: number;
  children: number;
  infants: number;
  totalPrice: number;
  currency: string;
  status: QuoteStatus;
  statusLabel: string;
  clientName: string;
  createdAt: string;
  hasSnapshot: boolean;
}

interface ListQuotesOptions {
  status?: QuoteStatus;
  search?: string;
  limit?: number;
}

type QuoteSnapshot = {
  pricing?: {
    finalTotal?: number;
    currency?: string;
  };
  summary?: {
    destination?: string;
  };
};

type QuoteRow = {
  id: string;
  reference: string | null;
  destination: string | null;
  departure_date: string | null;
  return_date: string | null;
  adults: number | null;
  children: number | null;
  infants: number | null;
  total_public_price: number | null;
  currency: string | null;
  status: string | null;
  created_at: string;
  snapshot: QuoteSnapshot | null;
  client?:
    | { full_name?: string | null }
    | Array<{ full_name?: string | null }>
    | null;
};

export async function listQuotes(
  options: ListQuotesOptions = {},
): Promise<QuoteListItem[]> {
  const supabase = await createServerSupabaseClient();
  const [agencyId, userId] = await Promise.all([
    getCurrentAgencyId(),
    getCurrentUserId(),
  ]);

  if (!userId) return [];

  let query = supabase
    .from("quotes")
    .select(
      "id, reference, destination, departure_date, return_date, adults, children, infants, total_public_price, currency, status, created_at, snapshot, client:clients(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 200);

  query = agencyId
    ? query.eq("agency_id", agencyId)
    : query.eq("user_id", userId);

  if (options.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const items = (data as QuoteRow[]).map(mapQuoteListItem);
  const search = options.search?.trim().toLowerCase();
  if (!search) return items;

  return items.filter(
    (item) =>
      item.destination.toLowerCase().includes(search) ||
      item.clientName.toLowerCase().includes(search) ||
      item.reference.toLowerCase().includes(search),
  );
}

function mapQuoteListItem(row: QuoteRow): QuoteListItem {
  const snapshot = row.snapshot ?? {};
  const client = Array.isArray(row.client) ? row.client[0] : row.client;
  const status = normalizeStatus(row.status);

  return {
    id: row.id,
    reference: row.reference?.trim() || row.id.slice(0, 8).toUpperCase(),
    destination:
      snapshot.summary?.destination ??
      row.destination?.trim() ??
      "Destino pendiente",
    departureDate: row.departure_date,
    returnDate: row.return_date,
    adults: Number(row.adults ?? 0),
    children: Number(row.children ?? 0),
    infants: Number(row.infants ?? 0),
    totalPrice: Number(
      snapshot.pricing?.finalTotal ?? row.total_public_price ?? 0,
    ),
    currency: snapshot.pricing?.currency ?? row.currency ?? "EUR",
    status,
    statusLabel: STATUS_LABELS[status],
    clientName: client?.full_name?.trim() || "Cliente sin nombre",
    createdAt: row.created_at,
    hasSnapshot: Boolean(row.snapshot),
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

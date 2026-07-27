import { getCurrentUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  InferredPreferencesSchema,
  type Client,
  type ClientWithQuoteHistory,
  type InferredPreferences,
} from "./types";

interface ListInput {
  search?: string;
  destinationFilter?: string;
  tierFilter?: string;
  yearFilter?: number;
  limit?: number;
}

export async function listClients(input: ListInput = {}): Promise<Client[]> {
  const supabase = await createServerSupabaseClient();
  const userId = await getCurrentUserId();
  if (!userId) return [];

  let query = supabase
    .from("clients")
    .select(
      "id, user_id, full_name, email, phone, inferred_preferences, total_quotes, last_quote_at, first_quote_at, created_at",
    )
    .eq("user_id", userId)
    .order("last_quote_at", { ascending: false, nullsFirst: false })
    .limit(input.limit ?? 50);

  if (input.search?.trim()) {
    const q = input.search.trim();
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  let clients = data.map(mapClient);

  if (input.destinationFilter) {
    const lower = input.destinationFilter.toLowerCase();
    clients = clients.filter((c) =>
      c.inferredPreferences.frequentDestinations.some((d) =>
        d.destination.toLowerCase().includes(lower),
      ),
    );
  }
  if (input.tierFilter) {
    clients = clients.filter(
      (c) => c.inferredPreferences.preferredHotelTier === input.tierFilter,
    );
  }
  if (input.yearFilter) {
    clients = clients.filter((c) => {
      if (!c.lastQuoteAt) return false;
      return new Date(c.lastQuoteAt).getFullYear() === input.yearFilter;
    });
  }

  return clients;
}

export async function getClientWithHistory(
  clientId: string,
): Promise<ClientWithQuoteHistory | null> {
  const supabase = await createServerSupabaseClient();
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, user_id, full_name, email, phone, inferred_preferences, total_quotes, last_quote_at, first_quote_at, created_at",
    )
    .eq("id", clientId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!client) return null;

  const { data: quotes } = await supabase
    .from("quotes")
    .select(
      "id, destination, departure_date, return_date, total_public_price, currency, status, created_at, snapshot, parsed",
    )
    .eq("client_id", clientId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return {
    ...mapClient(client),
    quotes: (quotes ?? []).map((q) => {
      const snap = q.snapshot as {
        pricing?: { finalTotal?: number; currency?: string };
      } | null;
      const parsed = q.parsed as {
        legs?: Array<{ destination?: string; arrivalDate?: string; departureDate?: string }>;
        destination?: string;
        dates?: { start?: string; end?: string };
      } | null;

      const destination =
        parsed?.legs?.[0]?.destination ??
        parsed?.destination ??
        q.destination ??
        "?";
      const checkIn =
        parsed?.legs?.[0]?.arrivalDate ??
        parsed?.dates?.start ??
        q.departure_date ??
        "";
      const checkOut =
        parsed?.legs?.[parsed.legs.length - 1]?.departureDate ??
        parsed?.dates?.end ??
        q.return_date ??
        "";

      return {
        id: q.id,
        destination,
        checkIn,
        checkOut,
        totalPrice:
          snap?.pricing?.finalTotal ?? Number(q.total_public_price) ?? 0,
        currency: snap?.pricing?.currency ?? q.currency ?? "EUR",
        status: q.status ?? "draft",
        createdAt: q.created_at,
      };
    }),
  };
}

function mapClient(row: Record<string, unknown>): Client {
  const prefs = parsePreferences(row.inferred_preferences);
  return {
    id: row.id as string,
    agencyId: row.user_id as string,
    name: (row.full_name as string) ?? "",
    email: (row.email as string | null) ?? undefined,
    phone: (row.phone as string | null) ?? undefined,
    inferredPreferences: prefs,
    totalQuotes: (row.total_quotes as number) ?? 0,
    lastQuoteAt: (row.last_quote_at as string | null) ?? undefined,
    firstQuoteAt: (row.first_quote_at as string | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}

function parsePreferences(raw: unknown): InferredPreferences {
  const parsed = InferredPreferencesSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  return {
    preferredHotelStyles: [],
    frequentDestinations: [],
    preferredThemes: [],
  };
}

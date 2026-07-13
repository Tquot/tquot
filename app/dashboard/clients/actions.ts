"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ClientQuoteRow } from "@/lib/clients/aggregate";

export type ClientRow = {
  id: string;
  full_name: string;
  email: string | null;
  created_at: string;
};

export async function getClientsWithQuotes(): Promise<{
  clients: ClientRow[];
  quotes: ClientQuoteRow[];
  error: string;
}> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { clients: [], quotes: [], error: "Not authenticated." };
  }

  const [{ data: clientRows, error: clientsError }, { data: quoteRows, error: quotesError }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, full_name, email, created_at")
        .eq("user_id", user.id)
        .order("full_name"),
      supabase
        .from("quotes")
        .select(
          "id, client_id, destination, departure_date, return_date, adults, children, total_public_price, currency, created_at, reference",
        )
        .eq("user_id", user.id)
        .not("client_id", "is", null)
        .order("created_at", { ascending: false }),
    ]);

  if (clientsError || quotesError) {
    return {
      clients: [],
      quotes: [],
      error: clientsError?.message ?? quotesError?.message ?? "Error loading clients",
    };
  }

  return {
    clients: (clientRows ?? []) as ClientRow[],
    quotes: (quoteRows ?? []) as ClientQuoteRow[],
    error: "",
  };
}

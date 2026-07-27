import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  inferPreferences,
  type PreferenceSource,
  type QuoteWithParsed,
} from "./preferences";

/**
 * Recalcula inferred_preferences a partir de las últimas cotizaciones del cliente.
 * Síncrono en v1 (aceptable: 100–300ms).
 */
export async function recomputeClientPreferences(
  clientId: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select(
      "snapshot, parsed, created_at, status, destination, departure_date, return_date, adults, children, total_public_price, currency",
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!quotes || quotes.length === 0) return;

  const history: QuoteWithParsed[] = quotes.map((q) => {
    if (q.parsed) {
      const snap = q.snapshot as {
        pricing?: { finalTotal?: number; currency?: string };
      } | null;
      return {
        quote: {
          totalPrice:
            snap?.pricing?.finalTotal ?? Number(q.total_public_price) ?? 0,
          currency: snap?.pricing?.currency ?? q.currency ?? "EUR",
        },
        parsed: q.parsed,
        createdAt: q.created_at,
        status: q.status ?? undefined,
      };
    }

    const fallback: PreferenceSource = {
      destination: q.destination ?? "",
      adults: q.adults ?? 1,
      children: q.children ?? 0,
      totalPrice: Number(q.total_public_price) ?? 0,
      currency: q.currency ?? "EUR",
      status: q.status ?? undefined,
      createdAt: q.created_at,
    };

    return {
      quote: {
        totalPrice: fallback.totalPrice,
        currency: fallback.currency,
      },
      parsed: fallback,
      createdAt: q.created_at,
      status: q.status ?? undefined,
    };
  });

  const preferences = inferPreferences(history);

  await supabase
    .from("clients")
    .update({ inferred_preferences: preferences })
    .eq("id", clientId);
}

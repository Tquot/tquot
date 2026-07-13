import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { fetchRatesFor } from "./fetcher";

/**
 * Devuelve el tipo de cambio from→to. Caché Supabase 1 día; fallback a tasa stale.
 */
export async function getRate(from: string, to: string): Promise<number> {
  const fromU = from.toUpperCase();
  const toU = to.toUpperCase();
  if (fromU === toU) return 1;

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    // Sin service role: intentar API directa
    const apiData = await fetchRatesFor(fromU);
    const rate = apiData.rates[toU];
    if (rate == null || rate === 0) {
      throw new Error(`rate_not_found_${fromU}_${toU}`);
    }
    return Number(rate);
  }

  const { data: cached } = await supabase
    .from("exchange_rates")
    .select("rate, expires_at")
    .eq("from_currency", fromU)
    .eq("to_currency", toU)
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cached) return Number(cached.rate);

  try {
    const apiData = await fetchRatesFor(fromU);
    const rate = apiData.rates[toU];
    if (rate == null || rate === 0) {
      throw new Error(`rate_not_found_${fromU}_${toU}`);
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 86_400_000);

    const upserts = Object.entries(apiData.rates).map(([target, r]) => ({
      from_currency: fromU,
      to_currency: target.toUpperCase(),
      rate: Number(r),
      source: "api",
      fetched_at: now.toISOString(),
      expires_at: expires.toISOString(),
    }));

    const chunkSize = 50;
    for (let i = 0; i < upserts.length; i += chunkSize) {
      const chunk = upserts.slice(i, i + chunkSize);
      await supabase
        .from("exchange_rates")
        .upsert(chunk, { onConflict: "from_currency,to_currency,source" });
    }

    return Number(rate);
  } catch (err) {
    const { data: stale } = await supabase
      .from("exchange_rates")
      .select("rate")
      .eq("from_currency", fromU)
      .eq("to_currency", toU)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (stale) return Number(stale.rate);
    throw err;
  }
}

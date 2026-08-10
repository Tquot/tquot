import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import { isNeverCoveredByConnector } from "../selector";
import { detectCategories } from "./categories";
import { searchProviders } from "./search";
import { sanitizeAccessibleCopy } from "./terminology";
import { buildCacheKey } from "./cache-key";
import type { ProviderBlock, ProviderCategory } from "./types";
import { verifyAll } from "./verify";

export type { ProviderBlock } from "./types";
export { buildCacheKey } from "./cache-key";

const TTL_DAYS = 30;

interface ResolveOpts {
  parsed: ParsedTripInputV2;
  agencyId: string;
  rawRequest: string | null;
  agencyAccessibilityDefault: boolean;
  /** Categorías que la agencia YA cubre con proveedor conectado. */
  connectedCategories: ProviderCategory[];
}

export async function resolveExternalProviders(
  o: ResolveOpts,
): Promise<ProviderBlock[]> {
  const raw = (o.rawRequest ?? "").toLowerCase();
  const wanted = detectCategories({
    parsed: o.parsed,
    raw,
    agencyAccessibilityDefault: o.agencyAccessibilityDefault,
  }).filter(
    (c) =>
      isNeverCoveredByConnector(c) || !o.connectedCategories.includes(c),
  );

  if (wanted.length === 0) return [];

  // Solo el primer tramo: buscar receptivos para cada leg de un multi-destino
  // multiplica el coste y el agente no lee seis bloques.
  const leg = o.parsed.legs[0];
  if (!leg?.destination) return [];

  const blocks = await Promise.all(
    wanted.map((category) =>
      resolveOne({
        category,
        destination: leg.destination,
        countryCode: null,
        travelers: {
          adults: o.parsed.travelers.adults,
          children: o.parsed.travelers.children.length,
        },
        dates:
          leg.arrivalDate && leg.departureDate
            ? { from: leg.arrivalDate, to: leg.departureDate }
            : null,
        rawRequest: o.rawRequest,
      }),
    ),
  );

  return blocks.filter((b): b is ProviderBlock => b !== null);
}

async function resolveOne(o: {
  category: ProviderCategory;
  destination: string;
  countryCode: string | null;
  travelers: { adults: number; children: number };
  dates: { from: string; to: string } | null;
  rawRequest: string | null;
}): Promise<ProviderBlock | null> {
  const cacheKey = buildCacheKey(o.category, o.destination);
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  try {
    const outcome = await searchProviders({
      category: o.category,
      destination: o.destination,
      country: o.countryCode,
      travelers: o.travelers,
      dates: o.dates,
      rawRequest: o.rawRequest,
    });

    let providers = verifyAll(outcome.providers, o.category, {
      destination: o.destination,
      countryCode: o.countryCode,
    });

    if (o.category === "accessible") {
      providers = providers.map((p) => ({
        ...p,
        description: sanitizeAccessibleCopy(p.description),
        signals: p.signals.map(sanitizeAccessibleCopy),
      }));
    }

    const block: ProviderBlock = {
      category: o.category,
      destination: o.destination,
      providers,
      noResultsReason:
        providers.length === 0
          ? (outcome.noResultsReason ??
            "No se encontraron operadores con datos de contacto verificables.")
          : null,
    };

    // Se cachea también el resultado vacío: si no hay nada en Formentera,
    // no merece la pena volver a pagar la búsqueda mañana.
    await writeCache(cacheKey, block, outcome.usage);
    return block;
  } catch (err) {
    console.warn(
      JSON.stringify({
        type: "external_providers_failed",
        category: o.category,
        destination: o.destination,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    // Un fallo aquí nunca debe tumbar la cotización
    return null;
  }
}

async function readCache(key: string): Promise<ProviderBlock | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("external_provider_cache")
      .select("payload, expires_at")
      .eq("cache_key", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    return data?.payload ? (data.payload as ProviderBlock) : null;
  } catch (err) {
    console.error("[external_provider_cache] read failed:", err);
    return null;
  }
}

async function writeCache(
  key: string,
  block: ProviderBlock,
  usage: { input: number; output: number; searches: number },
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("external_provider_cache").upsert(
      {
        cache_key: key,
        category: block.category,
        destination: block.destination,
        payload: block,
        provider_count: block.providers.length,
        tokens_in: usage.input,
        tokens_out: usage.output,
        searches: usage.searches,
        expires_at: new Date(
          Date.now() + TTL_DAYS * 86_400_000,
        ).toISOString(),
      },
      { onConflict: "cache_key" },
    );
  } catch (err) {
    console.error("[external_provider_cache] write failed:", err);
  }
}

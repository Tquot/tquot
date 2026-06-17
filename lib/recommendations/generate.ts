import "server-only";
import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import type { Quote } from "@/lib/quote-engine/types";
import type { Recommendation, RecommendedProvider } from "./types";
import { selectRelevantCategories } from "./selector";
import { getEntry } from "./catalog";
import { readCache, writeCache, normalizeDestination } from "./cache";
import { runRecommendationAgent } from "./agent";
import { validateProviderUrls } from "./url-validator";

interface GenerateInput {
  parsed: ParsedTripInputV2;
  quote: Quote;
  signal?: AbortSignal;
  onEvent?: (event: ProgressEvent) => void;
}

type ProgressEvent =
  | { type: "started"; category: string; legId?: string }
  | {
      type: "done";
      category: string;
      legId?: string;
      providers: RecommendedProvider[];
      source: "cache" | "fresh";
    }
  | { type: "error"; category: string; legId?: string; error: string };

export async function generateRecommendations(
  input: GenerateInput,
): Promise<Recommendation[]> {
  const relevant = selectRelevantCategories(input.parsed, input.quote);
  if (relevant.length === 0) return [];

  const validateUrls = process.env.RECOMMENDATIONS_VALIDATE_URLS === "true";
  const tripContext = buildTripContext(input.parsed, input.quote);

  const tasks: Promise<Recommendation | null>[] = [];

  for (const cat of relevant) {
    if (cat.scope === "global") {
      tasks.push(generateOne({ ...input, cat, tripContext, validateUrls }));
    } else {
      const uniqueDestinations = uniqueByDestination(cat.legs);
      for (const leg of uniqueDestinations.slice(0, 2)) {
        tasks.push(
          generateOne({
            ...input,
            cat,
            tripContext,
            validateUrls,
            destination: leg.destination,
            legId: leg.id,
          }),
        );
      }
    }
  }

  const results = await Promise.allSettled(tasks);
  const recommendations: Recommendation[] = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      recommendations.push(result.value);
    }
  }

  return recommendations;
}

interface GenerateOneInput extends GenerateInput {
  cat: ReturnType<typeof selectRelevantCategories>[number];
  tripContext: string;
  validateUrls: boolean;
  destination?: string;
  legId?: string;
}

async function generateOne(
  input: GenerateOneInput,
): Promise<Recommendation | null> {
  const entry = getEntry(input.cat.category);
  const destination = input.destination ?? globalDestinationFor(input.parsed);

  input.onEvent?.({
    type: "started",
    category: input.cat.category,
    legId: input.legId,
  });

  try {
    const cached = await readCache({ category: input.cat.category, destination });
    if (cached) {
      input.onEvent?.({
        type: "done",
        category: input.cat.category,
        legId: input.legId,
        providers: cached.providers,
        source: "cache",
      });
      return {
        category: input.cat.category,
        destinationNormalized: normalizeDestination(destination),
        providers: cached.providers,
        generatedAt: cached.generatedAt,
        source: "cache",
      };
    }
  } catch (err) {
    console.error("[recommendations] cache read failed:", err);
  }

  try {
    const response = await runRecommendationAgent({
      entry,
      destination,
      tripContext: input.tripContext,
      signal: input.signal,
    });

    if (input.validateUrls) {
      const urlMap = await validateProviderUrls(
        response.providers.map((p) => p.website),
        true,
      );
      const validProviders = response.providers.filter((p) => urlMap.get(p.website));
      if (validProviders.length < 2) {
        for (const p of response.providers) {
          if (!urlMap.get(p.website)) {
            p.confidence = "low";
            p.reasoning = `[URL no verificada] ${p.reasoning}`;
          }
        }
      }
    }

    void writeCache(
      { category: input.cat.category, destination },
      response.providers,
    );

    input.onEvent?.({
      type: "done",
      category: input.cat.category,
      legId: input.legId,
      providers: response.providers,
      source: "fresh",
    });

    return {
      category: input.cat.category,
      destinationNormalized: normalizeDestination(destination),
      providers: response.providers,
      generatedAt: new Date().toISOString(),
      source: "fresh",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    input.onEvent?.({
      type: "error",
      category: input.cat.category,
      legId: input.legId,
      error: message,
    });
    return null;
  }
}

function uniqueByDestination<T extends { destination: string }>(legs: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const leg of legs) {
    const key = leg.destination.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(leg);
    }
  }
  return result;
}

function globalDestinationFor(parsed: ParsedTripInputV2): string {
  return parsed.legs[0]?.destination ?? "global";
}

function buildTripContext(parsed: ParsedTripInputV2, quote: Quote): string {
  const totalPax = parsed.travelers.adults + parsed.travelers.children.length;
  const isGroup = !!quote.group;
  const audience = parsed.preferences.audience;
  const themes = parsed.preferences.themes.join(", ") || "sin tema específico";

  const legsLine = parsed.legs
    .map(
      (l) =>
        `${l.origin ?? "?"} → ${l.destination} (${l.arrivalDate} a ${l.departureDate})`,
    )
    .join("; ");

  return [
    `Viaje: ${legsLine}`,
    `Pasajeros: ${totalPax}${isGroup ? " (grupo)" : ""}${audience ? ` · ${audience}` : ""}`,
    `Temas: ${themes}`,
    `Presupuesto: ${describeBudget(parsed.budget)}`,
  ].join(". ");
}

function describeBudget(b: ParsedTripInputV2["budget"]): string {
  switch (b.kind) {
    case "unlimited":
      return "sin límite";
    case "tier":
      return b.tier;
    case "exact":
      return `${b.amount} ${b.currency}`;
    case "range":
      return `${b.min}-${b.max} ${b.currency}`;
    case "unspecified":
      return "no especificado";
  }
}

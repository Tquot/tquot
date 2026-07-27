import type { ParsedTripInput } from "@/lib/quotes/build-quote";
import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import type { InferredPreferences } from "./types";

export type HotelTier = "budget" | "mid" | "premium" | "luxury";

/** Normalized signals used by the pure inference algorithm. */
export interface PreferenceSource {
  destination: string;
  adults: number;
  children: number;
  hotelTier?: HotelTier;
  hotelStyles?: string[];
  audience?: string;
  themes?: string[];
  totalPrice: number;
  currency: string;
  status?: string;
  createdAt: string;
}

export interface QuoteWithParsed {
  quote:
    | { pricing: { finalTotal: number; currency: string } }
    | { totalPrice: number; currency: string };
  parsed: ParsedTripInput | ParsedTripInputV2 | PreferenceSource;
  createdAt: string;
  status?: string;
}

function isV2(parsed: unknown): parsed is ParsedTripInputV2 {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    "version" in parsed &&
    (parsed as { version?: unknown }).version === 2
  );
}

function isV1(parsed: unknown): parsed is ParsedTripInput {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    "destination" in parsed &&
    "passengers" in parsed &&
    "preferences" in parsed &&
    !("version" in parsed && (parsed as { version?: unknown }).version === 2)
  );
}

function mapV1HotelLevel(
  level: ParsedTripInput["preferences"]["hotelLevel"],
): HotelTier {
  if (level === "standard") return "mid";
  return level;
}

export function toPreferenceSource(entry: QuoteWithParsed): PreferenceSource {
  const { parsed, createdAt, status } = entry;

  if (isV2(parsed)) {
    const tier =
      parsed.budget.kind === "tier" ? parsed.budget.tier : undefined;
    const totalPrice =
      "pricing" in entry.quote
        ? entry.quote.pricing.finalTotal
        : entry.quote.totalPrice;
    const currency =
      "pricing" in entry.quote ? entry.quote.pricing.currency : entry.quote.currency;

    return {
      destination: parsed.legs[0]?.destination ?? "",
      adults: parsed.travelers.adults,
      children: parsed.travelers.children.length,
      hotelTier: tier,
      hotelStyles: parsed.preferences.hotelStyles,
      audience: parsed.preferences.audience,
      themes: parsed.preferences.themes,
      totalPrice,
      currency,
      status,
      createdAt,
    };
  }

  if (isV1(parsed)) {
    const totalPrice =
      "pricing" in entry.quote
        ? entry.quote.pricing.finalTotal
        : entry.quote.totalPrice;
    const currency =
      "pricing" in entry.quote ? entry.quote.pricing.currency : entry.quote.currency;

    return {
      destination: parsed.destination,
      adults: parsed.passengers.adults,
      children: parsed.passengers.children,
      hotelTier: mapV1HotelLevel(parsed.preferences.hotelLevel),
      hotelStyles: [],
      themes: [],
      totalPrice,
      currency,
      status,
      createdAt,
    };
  }

  // Already a PreferenceSource (or quote-column fallback)
  const source = parsed as PreferenceSource;
  return {
    ...source,
    createdAt: source.createdAt ?? createdAt,
    status: source.status ?? status,
  };
}

export function inferPreferences(history: QuoteWithParsed[]): InferredPreferences {
  const sources = history.map(toPreferenceSource);
  return inferPreferencesFromSources(sources);
}

export function inferPreferencesFromSources(
  history: PreferenceSource[],
): InferredPreferences {
  if (history.length === 0) {
    return {
      preferredHotelStyles: [],
      frequentDestinations: [],
      preferredThemes: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  // Reserved/accepted weigh more; everything else 0.5
  const weighted = history.map((h) => ({
    ...h,
    weight:
      h.status === "reserved" || h.status === "accepted"
        ? 1
        : h.status
          ? 0.5
          : 1,
  }));

  const tierCounts = new Map<string, number>();
  for (const { hotelTier, weight } of weighted) {
    if (hotelTier) {
      tierCounts.set(hotelTier, (tierCounts.get(hotelTier) ?? 0) + weight);
    }
  }
  const preferredHotelTier = mostFrequent(tierCounts) as HotelTier | undefined;

  const styleCounts = new Map<string, number>();
  for (const { hotelStyles, weight } of weighted) {
    for (const style of hotelStyles ?? []) {
      styleCounts.set(style, (styleCounts.get(style) ?? 0) + weight);
    }
  }
  const preferredHotelStyles = topN(styleCounts, 3);

  const destCounts = new Map<string, number>();
  for (const { destination, weight } of weighted) {
    const key = normalizeDestination(destination);
    if (!key) continue;
    destCounts.set(key, (destCounts.get(key) ?? 0) + weight);
  }
  const frequentDestinations = Array.from(destCounts.entries())
    .map(([destination, count]) => ({
      destination,
      count: Math.round(count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const groupSizes = weighted.map(({ adults, children }) => adults + children);
  const typicalGroupSize =
    groupSizes.length > 0 ? median(groupSizes) : undefined;

  const audienceCounts = new Map<string, number>();
  for (const { audience, weight } of weighted) {
    if (audience) {
      audienceCounts.set(audience, (audienceCounts.get(audience) ?? 0) + weight);
    }
  }
  const typicalAudience = mostFrequent(audienceCounts);

  const themeCounts = new Map<string, number>();
  for (const { themes, weight } of weighted) {
    for (const theme of themes ?? []) {
      themeCounts.set(theme, (themeCounts.get(theme) ?? 0) + weight);
    }
  }
  const preferredThemes = topN(themeCounts, 3);

  const eurQuotes = weighted.filter(({ currency }) => currency === "EUR");
  const averageBudgetEur =
    eurQuotes.length > 0
      ? Math.round(
          eurQuotes.reduce((sum, { totalPrice }) => sum + totalPrice, 0) /
            eurQuotes.length,
        )
      : undefined;

  return {
    preferredHotelTier,
    preferredHotelStyles,
    frequentDestinations,
    typicalGroupSize,
    typicalAudience,
    preferredThemes,
    averageBudgetEur,
    lastUpdated: new Date().toISOString(),
  };
}

function mostFrequent(map: Map<string, number>): string | undefined {
  if (map.size === 0) return undefined;
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

function topN(map: Map<string, number>, n: number): string[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function normalizeDestination(d: string): string {
  return d.trim();
}

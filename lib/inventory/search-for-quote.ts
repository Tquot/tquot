import type { InventoryCategory } from "@/app/dashboard/inventory/actions";
import {
  matchesExperienceDurationForTrip,
  parseDurationHours,
} from "@/lib/inventory/experience-duration";
import { normalizeInventoryPlace } from "@/lib/inventory/inventory-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type HotelLevel = "budget" | "standard" | "premium" | "luxury";

export const MAX_INVENTORY_QUOTE_RESULTS = 10;
export const MAX_INVENTORY_QUOTE_EXPERIENCES = 5;

export type InventoryQuoteRow = {
  id: string;
  category: InventoryCategory;
  name: string;
  data: Record<string, string>;
};

export type InventoryQuoteSearchParams = {
  destination: string;
  accessibility: boolean;
  hotelLevel: HotelLevel;
  durationDays: number;
};

export type InventoryQuoteSearchResult = {
  hotels: InventoryQuoteRow[];
  experiences: InventoryQuoteRow[];
};

const HOTEL_LEVEL_STARS: Record<HotelLevel, number> = {
  budget: 3,
  standard: 4,
  premium: 4,
  luxury: 5,
};

type ScoredRow = {
  row: InventoryQuoteRow;
  score: number;
};

export async function searchInventoryForQuote(
  userId: string,
  params: InventoryQuoteSearchParams,
): Promise<InventoryQuoteSearchResult> {
  const supabase = await createServerSupabaseClient();
  const destinationNorm = normalizeInventoryPlace(params.destination);

  const [hotelsQuery, experiencesQuery] = await Promise.all([
    supabase
      .from("inventory")
      .select("id,category,name,data")
      .eq("user_id", userId)
      .eq("category", "hotels"),
    supabase
      .from("inventory")
      .select("id,category,name,data")
      .eq("user_id", userId)
      .eq("category", "experiences"),
  ]);

  if (hotelsQuery.error) {
    console.warn(
      "[inventory/search-for-quote] hotels query failed",
      hotelsQuery.error.message,
    );
  }
  if (experiencesQuery.error) {
    console.warn(
      "[inventory/search-for-quote] experiences query failed",
      experiencesQuery.error.message,
    );
  }

  const hotels = scoreAndRankRows(
    (hotelsQuery.data ?? []).map(toInventoryQuoteRow),
    destinationNorm,
    params,
    true,
    MAX_INVENTORY_QUOTE_RESULTS,
  );
  const experiences = scoreAndRankRows(
    (experiencesQuery.data ?? []).map(toInventoryQuoteRow),
    destinationNorm,
    params,
    false,
    MAX_INVENTORY_QUOTE_EXPERIENCES,
  );

  return { hotels, experiences };
}

function toInventoryQuoteRow(raw: {
  id: string;
  category: string;
  name: string;
  data: Record<string, string> | null;
}): InventoryQuoteRow {
  return {
    id: raw.id,
    category: raw.category as InventoryCategory,
    name: raw.name,
    data: raw.data ?? {},
  };
}

function scoreAndRankRows(
  rows: InventoryQuoteRow[],
  destinationNorm: string,
  params: InventoryQuoteSearchParams,
  applyHotelStars: boolean,
  limit: number,
): InventoryQuoteRow[] {
  const scored: ScoredRow[] = [];

  for (const row of rows) {
    if (applyHotelStars && row.category !== "hotels") continue;
    if (!applyHotelStars && row.category !== "experiences") continue;

    if (!applyHotelStars) {
      const durationHours = parseDurationHours(row.data.duration);
      if (
        !matchesExperienceDurationForTrip(durationHours, params.durationDays)
      ) {
        continue;
      }
    }

    const destinationScore = scoreDestination(row, destinationNorm);
    if (destinationScore <= 0) continue;

    const total =
      destinationScore +
      scoreAccessibility(row.data, params.accessibility) +
      scoreCommission(row.data) +
      (applyHotelStars ? scoreStars(row.data, params.hotelLevel) : 0);

    scored.push({ row, score: total });
  }

  return takeTopScored(scored, limit);
}

function takeTopScored(entries: ScoredRow[], limit: number): InventoryQuoteRow[] {
  return entries
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.row);
}

function scoreDestination(row: InventoryQuoteRow, destinationNorm: string): number {
  if (!destinationNorm) return 0;

  const candidates = [row.data.destination, row.data.city, row.name]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => normalizeInventoryPlace(value));

  let best = 0;
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate === destinationNorm) {
      best = Math.max(best, 100);
    } else if (
      candidate.includes(destinationNorm) ||
      destinationNorm.includes(candidate)
    ) {
      best = Math.max(best, 50);
    }
  }
  return best;
}

function scoreAccessibility(
  data: Record<string, string>,
  required: boolean,
): number {
  if (!required) return 0;
  const value = (data.accessible ?? "").toLowerCase().trim();
  if (["true", "yes", "si", "sí", "1"].includes(value)) return 30;
  return 0;
}

function scoreCommission(data: Record<string, string>): number {
  const raw = data.commission_percent ?? data.commission ?? "";
  const parsed = Number.parseFloat(String(raw).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(parsed, 30);
}

function scoreStars(data: Record<string, string>, hotelLevel: HotelLevel): number {
  const expected = HOTEL_LEVEL_STARS[hotelLevel];
  const stars = Number.parseInt(data.stars ?? "", 10);
  if (!Number.isFinite(stars)) return 0;
  if (stars === expected) return 20;
  if (Math.abs(stars - expected) === 1) return 10;
  return 0;
}

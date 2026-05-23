import type { InventoryCategory } from "@/app/dashboard/inventory/actions";
import { normalizeInventoryPlace } from "@/lib/inventory/inventory-utils";

type HotelLevel = "budget" | "standard" | "premium" | "luxury";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const MAX_INVENTORY_QUOTE_RESULTS = 10;

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
  const { data, error } = await supabase
    .from("inventory")
    .select("id,category,name,data")
    .eq("user_id", userId)
    .in("category", ["hotels", "experiences"]);

  if (error || !data) {
    console.warn("[inventory/search-for-quote] query failed", error?.message);
    return { hotels: [], experiences: [] };
  }

  const destinationNorm = normalizeInventoryPlace(params.destination);
  const hotels: ScoredRow[] = [];
  const experiences: ScoredRow[] = [];

  for (const raw of data) {
    const row: InventoryQuoteRow = {
      id: raw.id as string,
      category: raw.category as InventoryCategory,
      name: raw.name as string,
      data: (raw.data as Record<string, string>) ?? {},
    };

    const destinationScore = scoreDestination(row, destinationNorm);
    if (destinationScore <= 0) continue;

    const total =
      destinationScore +
      scoreAccessibility(row.data, params.accessibility) +
      scoreCommission(row.data) +
      (row.category === "hotels"
        ? scoreStars(row.data, params.hotelLevel)
        : 0);

    const entry = { row, score: total };
    if (row.category === "hotels") {
      hotels.push(entry);
    } else {
      experiences.push(entry);
    }
  }

  return {
    hotels: takeTopScored(hotels),
    experiences: takeTopScored(experiences),
  };
}

function takeTopScored(entries: ScoredRow[]): InventoryQuoteRow[] {
  return entries
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_INVENTORY_QUOTE_RESULTS)
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

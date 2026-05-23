import type { InventoryQuoteRow } from "@/lib/inventory/search-for-quote";
import {
  normalizeInventoryPlace,
  resolveInventoryNetPrice,
  resolveInventoryProvider,
} from "@/lib/inventory/inventory-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { QuoteItem } from "@/lib/quotes/build-quote";

function isInsuranceRow(name: string, data: Record<string, string>): boolean {
  const haystack = [
    name,
    data.type ?? "",
    data.tags ?? "",
    data.category ?? "",
    data.notes ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return /seguro|insurance/.test(haystack);
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

export async function searchInsuranceInventory(
  userId: string,
  destination: string,
): Promise<InventoryQuoteRow | null> {
  const supabase = await createServerSupabaseClient();
  const destinationNorm = normalizeInventoryPlace(destination);

  const { data, error } = await supabase
    .from("inventory")
    .select("id,category,name,data")
    .eq("user_id", userId)
    .in("category", ["suppliers", "tour_operators"]);

  if (error) {
    console.warn("[refine/inventory-insurance] query failed", error.message);
    return null;
  }

  type Scored = { row: InventoryQuoteRow; score: number };
  const scored: Scored[] = [];

  for (const raw of data ?? []) {
    const row: InventoryQuoteRow = {
      id: raw.id,
      category: raw.category,
      name: raw.name,
      data: raw.data ?? {},
    };

    if (!isInsuranceRow(row.name, row.data)) continue;

    const destinationScore = scoreDestination(row, destinationNorm);
    scored.push({ row, score: destinationScore + (destinationScore > 0 ? 10 : 1) });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.row ?? null;
}

export function inventoryRowToInsuranceQuoteItem(
  row: InventoryQuoteRow,
  pax: number,
  alternative: boolean,
): QuoteItem {
  const unitPrice = resolveInventoryNetPrice(row.data);
  const price = unitPrice > 0 ? Math.round(unitPrice * pax) : Math.round(55 * pax);

  return {
    id: `exp-insurance-${row.id.slice(0, 8)}`,
    type: "experience",
    title: row.name,
    provider: resolveInventoryProvider(row.data),
    price,
    markup: 0,
    finalPrice: price,
    source: "inventory",
    description: row.data.notes?.trim() || undefined,
    alternative,
  };
}

export function mockInsuranceToQuoteItem(
  product: {
    id: string;
    name: string;
    provider: string;
    pricePerPerson: number;
    notes: string;
  },
  pax: number,
  alternative: boolean,
): QuoteItem {
  const price = Math.round(product.pricePerPerson * pax);

  return {
    id: `exp-insurance-${product.id}`,
    type: "experience",
    title: product.name,
    provider: product.provider,
    price,
    markup: 0,
    finalPrice: price,
    source: "mock",
    description: product.notes,
    alternative,
  };
}

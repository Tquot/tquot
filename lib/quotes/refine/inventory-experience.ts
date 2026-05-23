import type { InventoryQuoteRow } from "@/lib/inventory/search-for-quote";
import { searchInventoryForQuote } from "@/lib/inventory/search-for-quote";
import {
  resolveInventoryNetPrice,
  resolveInventoryProvider,
} from "@/lib/inventory/inventory-utils";
import type { ParsedTripInput, QuoteItem } from "@/lib/quotes/build-quote";

function normalizeSearchTerm(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function experienceMatchesType(row: InventoryQuoteRow, type: string): boolean {
  const needle = normalizeSearchTerm(type);
  if (!needle) return false;

  const haystack = normalizeSearchTerm(
    [row.name, row.data.notes, row.data.tags, row.data.type].filter(Boolean).join(" "),
  );

  return (
    haystack.includes(needle) ||
    needle.split(/\s+/).some((word) => word.length > 2 && haystack.includes(word))
  );
}

export async function searchExperienceForRefine(
  userId: string,
  tripInput: ParsedTripInput,
  type: string,
): Promise<InventoryQuoteRow | null> {
  const startMs = Date.parse(tripInput.dates.start);
  const endMs = Date.parse(tripInput.dates.end);
  const durationDays = Math.max(
    1,
    Number.isNaN(startMs) || Number.isNaN(endMs)
      ? 1
      : Math.ceil((endMs - startMs) / 86_400_000),
  );

  const result = await searchInventoryForQuote(userId, {
    destination: tripInput.destination,
    accessibility: tripInput.preferences.accessibility,
    hotelLevel: tripInput.preferences.hotelLevel,
    durationDays,
  });

  const matches = result.experiences.filter((row) => experienceMatchesType(row, type));
  return matches[0] ?? result.experiences[0] ?? null;
}

export function inventoryRowToExperienceQuoteItem(
  row: InventoryQuoteRow,
  tripInput: ParsedTripInput,
  alternative: boolean,
): QuoteItem {
  const totalPax = tripInput.passengers.adults + tripInput.passengers.children;
  const unitPrice = resolveInventoryNetPrice(row.data);
  const price =
    unitPrice > 0
      ? Math.round(unitPrice * Math.max(1, totalPax))
      : Math.round(45 * totalPax);

  return {
    id: `exp-refine-${row.id.slice(0, 8)}`,
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

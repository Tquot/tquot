import type { Locale } from "@/app/dashboard/translations";
import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import type { Quote as EngineQuote } from "@/lib/quote-engine/types";
import type { Quote } from "@/lib/quotes/build-quote";
import type { SuggestionContext } from "./suggestions/types";
import type { ComparatorEntry } from "@/lib/comparator/types";

export function emptySuggestionCtx(
  parsed: ParsedTripInputV2,
  opts?: { locale?: Locale },
): SuggestionContext {
  return {
    quote: {
      id: "pending",
      summary: {
        route: "",
        durationDays: 0,
        passengers: { adults: 0, children: 0, total: 0 },
      },
      flights: [],
      hotels: [],
      experiences: [],
      transfers: [],
      pricing: { baseTotal: 0, margin: 0, finalTotal: 0, currency: "EUR" },
      _meta: {
        flightsSource: "mock",
        hotelsSource: "mock",
        experiencesSource: "mock",
        transfersSource: "mock",
      },
    },
    parsed,
    candidates: {
      flights: [],
      hotels: [],
      experiences: [],
      transfers: [],
    },
    agency: { accessibilityDefault: false, defaultMarginPct: 12 },
    dismissed: [],
    locale: opts?.locale ?? "es",
  };
}

export function suggestionCtxFromQuote(
  parsed: ParsedTripInputV2,
  quote: Quote | EngineQuote,
  opts?: {
    comparator?: ComparatorEntry[];
    dismissed?: string[];
    locale?: Locale;
  },
): SuggestionContext {
  return {
    quote: quote as Quote,
    parsed,
    candidates: {
      flights: [],
      hotels: [],
      experiences: [],
      transfers: [],
    },
    comparator: opts?.comparator,
    agency: { accessibilityDefault: false, defaultMarginPct: 12 },
    dismissed: opts?.dismissed ?? [],
    locale: opts?.locale ?? "es",
  };
}

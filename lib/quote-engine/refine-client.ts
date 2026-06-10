import {
  applyItemMargin,
  getItemMarginPercent,
  getMarginPercent,
  itemsForPricing,
  marginCategoryForItemType,
  pricedQuoteItemsFromQuote,
  syncQuotePricing,
  type ParsedTripInput,
  type Quote,
  type QuoteItem,
} from "@/lib/quotes/build-quote";
import type { RefineApplyResult, RefineQuotePatch } from "@/lib/quotes/refine/types";

function cloneQuote(quote: Quote): Quote {
  return {
    ...quote,
    flights: quote.flights.map((item) => ({ ...item })),
    transfers: quote.transfers.map((item) => ({ ...item })),
    hotels: quote.hotels.map((item) => ({ ...item })),
    experiences: quote.experiences.map((item) => ({ ...item })),
    summary: { ...quote.summary, passengers: { ...quote.summary.passengers } },
    pricing: { ...quote.pricing },
    _meta: { ...quote._meta },
  };
}

export function mergeRefinePatch(quote: Quote, patch: RefineQuotePatch): Quote {
  const next = cloneQuote(quote);
  if (patch.hotels) {
    next.hotels = patch.hotels.map((item) => ({ ...item }));
  }
  if (patch.experiences) {
    next.experiences = patch.experiences.map((item) => ({ ...item }));
  }
  if (patch.transfers) {
    next.transfers = patch.transfers.map((item) => ({ ...item }));
  }
  if (patch.flights) {
    next.flights = patch.flights.map((item) => ({ ...item }));
  }
  if (patch._meta) {
    next._meta = { ...next._meta, ...patch._meta };
  }
  return next;
}

export function reapplyQuoteMargins(
  quote: Quote,
  tripInput: ParsedTripInput | null,
): void {
  const pricedItems = pricedQuoteItemsFromQuote(quote);
  const baseTotal = pricedItems.reduce((sum, item) => sum + item.price, 0);

  const allItems: QuoteItem[] = [
    ...quote.flights,
    ...quote.transfers,
    ...quote.hotels,
    ...quote.experiences,
  ];

  for (const item of allItems) {
    const category = marginCategoryForItemType(item.type);
    applyItemMargin(
      item,
      tripInput?.agencyMargins && category
        ? getMarginPercent(baseTotal, tripInput.agencyMargins, category)
        : getMarginPercent(baseTotal),
    );
  }

  syncQuotePricing(quote);
}

function isDirectFlight(item: QuoteItem): boolean {
  if (item.flightDetails) {
    return item.flightDetails.stops === 0;
  }
  return /\bdirecto\b|0 escala|\bDirect\b/i.test(item.title);
}

export function filterDirectFlights(quote: Quote): { next: Quote; message: string } {
  const cloned = cloneQuote(quote);
  const outbound = cloned.flights.filter((item) => item.id.startsWith("flight-out-"));
  const returnLeg = cloned.flights.filter((item) =>
    item.id.startsWith("flight-return-"),
  );
  const other = cloned.flights.filter(
    (item) =>
      !item.id.startsWith("flight-out-") && !item.id.startsWith("flight-return-"),
  );

  const directOutbound = outbound.filter(isDirectFlight);
  const directReturn = returnLeg.filter(isDirectFlight);

  if (directOutbound.length === 0 && directReturn.length === 0) {
    return {
      next: cloned,
      message: "No hay vuelos directos en la cotización actual.",
    };
  }

  const nextOutbound = (directOutbound.length > 0 ? directOutbound : outbound).map(
    (item, index) => ({ ...item, alternative: index > 0 }),
  );
  const nextReturn = (directReturn.length > 0 ? directReturn : returnLeg).map(
    (item, index) => ({ ...item, alternative: index > 0 }),
  );

  cloned.flights = [...nextOutbound, ...nextReturn, ...other];

  const warnings: string[] = [];
  if (directOutbound.length === 0) warnings.push("ida");
  if (directReturn.length === 0) warnings.push("vuelta");

  const message =
    warnings.length > 0
      ? `He filtrado vuelos directos donde era posible. Sin opciones directas en: ${warnings.join(" y ")}.`
      : "He dejado solo vuelos directos en la cotización.";

  return { next: cloned, message };
}

export function applyCheaperMargins(quote: Quote): Quote {
  const next = cloneQuote(quote);
  for (const item of pricedQuoteItemsFromQuote(next)) {
    applyItemMargin(item, getItemMarginPercent(item) * 0.85);
  }
  syncQuotePricing(next);
  return next;
}

export type ClientRefineResult = {
  quote: Quote;
  tripInput: ParsedTripInput | null;
  message: string;
  suggestion?: string;
};

export function applyClientRefinement(
  action: RefineApplyResult & { action?: string },
  quote: Quote,
  tripInput: ParsedTripInput,
  refineAction: { action: string },
): ClientRefineResult | null {
  if (refineAction.action === "cheaper") {
    const next = applyCheaperMargins(quote);
    return {
      quote: next,
      tripInput,
      message: "He reducido los márgenes un 15 % en todas las líneas.",
    };
  }

  if (refineAction.action === "filter_direct_flights") {
    const filtered = filterDirectFlights(quote);
    syncQuotePricing(filtered.next);
    return {
      quote: filtered.next,
      tripInput,
      message: filtered.message,
    };
  }

  if (action.patch) {
    const next = mergeRefinePatch(quote, action.patch);
    const nextTripInput = action.updatedTripInput ?? tripInput;
    reapplyQuoteMargins(next, nextTripInput);
    return {
      quote: next,
      tripInput: nextTripInput,
      message: action.message,
      suggestion: action.suggestion,
    };
  }

  return null;
}

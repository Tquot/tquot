/**
 * Aplica la moneda base de la agencia al quote compuesto.
 * Degrada silenciosamente a EUR (sin conversión) si falla auth/API.
 */
import "server-only";

import type { Quote } from "@/lib/quotes/build-quote";
import { convertQuoteToBaseCurrency } from "./convert";
import { loadAgencyCurrency } from "./loader";

export async function applyAgencyBaseCurrency(quote: Quote): Promise<Quote> {
  try {
    const baseCurrency = await loadAgencyCurrency();
    return await convertQuoteToBaseCurrency(quote, baseCurrency);
  } catch (err) {
    console.warn("[applyAgencyBaseCurrency] skipped:", err);
    return quote;
  }
}

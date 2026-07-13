/**
 * Aplica una moneda base al quote compuesto.
 * La moneda se carga en el caller (server) — este módulo no toca next/headers.
 */

import type { Quote } from "@/lib/quotes/build-quote";
import { convertQuoteToBaseCurrency } from "./convert";

export async function applyBaseCurrencyToQuote(
  quote: Quote,
  baseCurrency: string = "EUR",
): Promise<Quote> {
  try {
    return await convertQuoteToBaseCurrency(quote, baseCurrency);
  } catch (err) {
    console.warn("[applyBaseCurrencyToQuote] skipped:", err);
    return quote;
  }
}

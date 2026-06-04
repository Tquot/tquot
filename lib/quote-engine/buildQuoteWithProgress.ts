import { buildQuote } from "@/lib/quotes/build-quote";
import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import type { BuildEvent, QuoteSection } from "@/lib/quote-engine/types";

const BUILD_SECTIONS: QuoteSection[] = [
  "flights",
  "hotels",
  "experiences",
  "transfers",
];

export interface BuildQuoteWithProgressOptions {
  signal?: AbortSignal;
  onEvent: (event: BuildEvent) => void;
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const err = new Error("Build aborted");
    err.name = "AbortError";
    throw err;
  }
}

function sectionResults(quote: Quote, section: QuoteSection): unknown[] {
  switch (section) {
    case "flights":
      return quote.flights;
    case "hotels":
      return quote.hotels;
    case "experiences":
      return quote.experiences;
    case "transfers":
      return quote.transfers;
  }
}

/**
 * Wraps {@link buildQuote} and emits SSE-friendly progress events.
 * Phase 0: section lifecycle events bracket a single buildQuote call.
 * Later phases can split per-section search for true parallel streaming.
 */
export async function buildQuoteWithProgress(
  parsed: ParsedTripInput,
  { signal, onEvent }: BuildQuoteWithProgressOptions,
): Promise<Quote> {
  const ts = () => Date.now();

  onEvent({ type: "build.started", ts: ts() });
  assertNotAborted(signal);

  for (const section of BUILD_SECTIONS) {
    onEvent({ type: "section.started", section, ts: ts() });
  }

  assertNotAborted(signal);

  let quote: Quote;
  try {
    quote = await buildQuote(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    for (const section of BUILD_SECTIONS) {
      onEvent({
        type: "section.error",
        section,
        error: message,
        skipped: true,
        ts: ts(),
      });
    }
    throw err;
  }

  assertNotAborted(signal);

  for (const section of BUILD_SECTIONS) {
    onEvent({
      type: "section.done",
      section,
      results: sectionResults(quote, section),
      ts: ts(),
    });
  }

  onEvent({ type: "build.done", quote, ts: ts() });
  return quote;
}

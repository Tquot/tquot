"use client";

import type { Quote, QuoteDataSource, QuoteItem } from "@/lib/quotes/build-quote";
import type { Locale } from "../translations";

export function formatCurrency(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function allQuoteItems(quote: Quote): QuoteItem[] {
  return [
    ...quote.flights,
    ...quote.transfers,
    ...quote.hotels,
    ...quote.experiences,
  ];
}

export function cloneQuote(quote: Quote): Quote {
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

export function DataSourceBadge({ source }: { source: QuoteDataSource }) {
  if (source === "real") {
    return (
      <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-tquot-success/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-tquot-success">
        ✓ Datos reales
      </span>
    );
  }

  return (
    <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-tquot-warm/30 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-tquot-warm">
      ⚠ Datos de ejemplo
    </span>
  );
}

export function TotalCard({
  label,
  value,
  highlight,
  locale,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  locale: Locale;
}) {
  return (
    <div
      className={`rounded-xl px-4 py-4 sm:px-5 sm:py-5 ${
        highlight ? "border border-tquot-teal/30 bg-tquot-teal/5" : "border-0"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-tquot-muted">
        {label}
      </p>
      <p
        className={`mt-2 tabular-nums text-3xl font-black sm:text-4xl ${
          highlight ? "text-tquot-teal" : "text-tquot-text"
        }`}
      >
        {formatCurrency(value, locale)}
      </p>
    </div>
  );
}

export function SectionSkeleton({ title }: { title: string }) {
  return (
    <div className="animate-pulse rounded-xl border border-tquot-border bg-tquot-surface p-4">
      <div className="mb-3 h-4 w-32 rounded bg-tquot-border" />
      <p className="mb-3 text-sm font-semibold text-tquot-muted">{title}</p>
      <div className="space-y-2">
        <div className="h-16 rounded-lg bg-tquot-bg" />
        <div className="h-16 rounded-lg bg-tquot-bg" />
      </div>
    </div>
  );
}

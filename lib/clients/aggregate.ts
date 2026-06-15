export type ClientQuoteRow = {
  id: string;
  client_id: string | null;
  destination: string;
  departure_date: string;
  return_date: string;
  adults: number;
  children: number;
  total_public_price: number;
  currency: string;
  created_at: string;
  reference: string;
};

export type ClientStats = {
  quoteCount: number;
  lastQuoteAt: string | null;
  totalSpentByCurrency: Record<string, number>;
};

export function aggregateClientStats(quotes: ClientQuoteRow[]): ClientStats {
  if (quotes.length === 0) {
    return { quoteCount: 0, lastQuoteAt: null, totalSpentByCurrency: {} };
  }

  const totalSpentByCurrency: Record<string, number> = {};
  let lastQuoteAt: string | null = null;

  for (const quote of quotes) {
    totalSpentByCurrency[quote.currency] =
      (totalSpentByCurrency[quote.currency] ?? 0) + Number(quote.total_public_price);

    if (!lastQuoteAt || quote.created_at > lastQuoteAt) {
      lastQuoteAt = quote.created_at;
    }
  }

  return {
    quoteCount: quotes.length,
    lastQuoteAt,
    totalSpentByCurrency,
  };
}

export function inferTopDestinations(
  quotes: ClientQuoteRow[],
  limit = 3,
): Array<{ destination: string; count: number }> {
  const counts = new Map<string, number>();

  for (const quote of quotes) {
    const key = quote.destination.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([destination, count]) => ({ destination, count }))
    .sort((a, b) => b.count - a.count || a.destination.localeCompare(b.destination))
    .slice(0, limit);
}

export function inferTypicalGroupSize(quotes: ClientQuoteRow[]): number | null {
  if (quotes.length === 0) return null;

  const sizes = quotes
    .map((quote) => quote.adults + quote.children)
    .filter((size) => size > 0)
    .sort((a, b) => a - b);

  if (sizes.length === 0) return null;

  const mid = Math.floor(sizes.length / 2);
  if (sizes.length % 2 === 0) {
    return Math.round((sizes[mid - 1] + sizes[mid]) / 2);
  }
  return sizes[mid];
}

export function formatTotalSpent(
  totals: Record<string, number>,
  locale: "es" | "en",
): string {
  const entries = Object.entries(totals).filter(([, value]) => value > 0);
  if (entries.length === 0) return "—";

  return entries
    .map(([currency, value]) =>
      new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value),
    )
    .join(" · ");
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  aggregateClientStats,
  formatTotalSpent,
  inferTopDestinations,
  inferTypicalGroupSize,
  type ClientQuoteRow,
} from "@/lib/clients/aggregate";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useDashboardLanguage } from "../dashboard-language-provider";
import { formatMessage } from "../format-message";
import { LocaleToggleButtons } from "../locale-toggle-buttons";

type ClientRow = {
  id: string;
  full_name: string;
  email: string | null;
  created_at: string;
};

type ClientWithStats = ClientRow & {
  quotes: ClientQuoteRow[];
  stats: ReturnType<typeof aggregateClientStats>;
  topDestinations: ReturnType<typeof inferTopDestinations>;
  typicalGroupSize: number | null;
};

const backLinkClass =
  "inline-flex items-center rounded-lg border border-tquot-border bg-tquot-surface px-4 py-2 text-sm text-tquot-muted shadow-sm transition-colors hover:bg-tquot-bg hover:text-tquot-accent";

const inputClass =
  "w-full rounded-xl border border-tquot-border bg-tquot-surface px-4 py-3 text-tquot-text outline-none transition-colors focus:border-tquot-accent focus:ring-2 focus:ring-tquot-accent/20";

function formatDate(date: string, locale: "es" | "en") {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatPrice(value: number, currency: string, locale: "es" | "en") {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ClientsClient() {
  const { locale, t } = useDashboardLanguage();
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    setError("");

    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated.");
      setIsLoading(false);
      return;
    }

    const [{ data: clientRows, error: clientsError }, { data: quoteRows, error: quotesError }] =
      await Promise.all([
        supabase
          .from("clients")
          .select("id, full_name, email, created_at")
          .eq("user_id", user.id)
          .order("full_name"),
        supabase
          .from("quotes")
          .select(
            "id, client_id, destination, departure_date, return_date, adults, children, total_public_price, currency, created_at, reference",
          )
          .eq("user_id", user.id)
          .not("client_id", "is", null)
          .order("created_at", { ascending: false }),
      ]);

    if (clientsError || quotesError) {
      setError(clientsError?.message ?? quotesError?.message ?? "Error loading clients");
      setIsLoading(false);
      return;
    }

    const quotesByClient = new Map<string, ClientQuoteRow[]>();
    for (const quote of (quoteRows ?? []) as ClientQuoteRow[]) {
      if (!quote.client_id) continue;
      const bucket = quotesByClient.get(quote.client_id) ?? [];
      bucket.push(quote);
      quotesByClient.set(quote.client_id, bucket);
    }

    const enriched = ((clientRows ?? []) as ClientRow[]).map((client) => {
      const quotes = quotesByClient.get(client.id) ?? [];
      return {
        ...client,
        quotes,
        stats: aggregateClientStats(quotes),
        topDestinations: inferTopDestinations(quotes),
        typicalGroupSize: inferTypicalGroupSize(quotes),
      };
    });

    setClients(enriched);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;

    return clients.filter((client) => {
      const nameMatch = client.full_name.toLowerCase().includes(query);
      const emailMatch = client.email?.toLowerCase().includes(query) ?? false;
      const destinationMatch = client.quotes.some((quote) =>
        quote.destination.toLowerCase().includes(query),
      );
      return nameMatch || emailMatch || destinationMatch;
    });
  }, [clients, search]);

  return (
    <div className="min-h-screen px-6 py-10 text-tquot-text">
      <main className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/dashboard" className={backLinkClass}>
            ← {t.backToDashboard}
          </Link>
          <LocaleToggleButtons />
        </div>

        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-tquot-teal">
            TQuot
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-tquot-text sm:text-4xl">
            {t.clientsTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-tquot-muted">{t.clientsSubtitle}</p>
        </section>

        <section className="mb-6">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.clientsSearch}
            className={inputClass}
          />
        </section>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-tquot-muted">{t.clientsLoading}</p>
        ) : filteredClients.length === 0 ? (
          <div className="rounded-xl border border-tquot-border bg-tquot-surface px-6 py-14 text-center shadow-sm">
            <p className="text-sm text-tquot-muted">{t.clientsEmpty}</p>
            <Link
              href="/dashboard/new-quote"
              className="mt-4 inline-flex rounded-xl bg-tquot-teal px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#00b396]"
            >
              {t.createFirstQuote}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client) => {
              const isSelected = client.id === selectedClientId;
              return (
                <div
                  key={client.id}
                  className="overflow-hidden rounded-xl border border-tquot-border bg-tquot-surface shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedClientId(isSelected ? null : client.id)
                    }
                    className="flex w-full flex-col gap-4 p-5 text-left transition-colors hover:bg-tquot-bg sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-tquot-text">
                        {client.full_name}
                      </p>
                      <p className="mt-1 text-sm text-tquot-muted">
                        {client.email || "—"}
                      </p>
                    </div>
                    <div className="grid shrink-0 grid-cols-1 gap-2 text-sm sm:grid-cols-3 sm:gap-6">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-tquot-muted">
                          {t.clientQuoteCount}
                        </p>
                        <p className="font-semibold tabular-nums">{client.stats.quoteCount}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-tquot-muted">
                          {t.clientLastQuote}
                        </p>
                        <p className="font-semibold">
                          {client.stats.lastQuoteAt
                            ? formatDate(client.stats.lastQuoteAt, locale)
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-tquot-muted">
                          {t.clientTotalSpent}
                        </p>
                        <p className="font-semibold tabular-nums text-tquot-teal">
                          {formatTotalSpent(client.stats.totalSpentByCurrency, locale)}
                        </p>
                      </div>
                    </div>
                  </button>

                  {isSelected ? (
                    <div className="border-t border-tquot-border bg-tquot-bg px-5 py-5">
                      <div className="mb-6 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-tquot-border bg-tquot-surface p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-tquot-muted">
                            {t.clientPreferences}
                          </p>
                          <p className="mt-2 text-sm text-tquot-text">
                            <span className="font-medium">{t.clientTopDestinations}: </span>
                            {client.topDestinations.length > 0
                              ? client.topDestinations
                                  .map((entry) => `${entry.destination} (${entry.count})`)
                                  .join(", ")
                              : "—"}
                          </p>
                          <p className="mt-2 text-sm text-tquot-text">
                            <span className="font-medium">{t.clientTypicalGroupSize}: </span>
                            {client.typicalGroupSize
                              ? formatMessage(t.clientTravelers, {
                                  count: String(client.typicalGroupSize),
                                })
                              : "—"}
                          </p>
                        </div>
                      </div>

                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-tquot-muted">
                        {t.clientQuoteHistory}
                      </h3>

                      {client.quotes.length === 0 ? (
                        <p className="text-sm text-tquot-muted">{t.clientsNoQuotes}</p>
                      ) : (
                        <ul className="space-y-3">
                          {client.quotes.map((quote) => (
                            <li
                              key={quote.id}
                              className="flex flex-col gap-3 rounded-xl border border-tquot-border bg-tquot-surface p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="font-semibold text-tquot-text">
                                  {quote.destination}
                                </p>
                                <p className="mt-1 text-sm text-tquot-muted">
                                  {formatDate(quote.departure_date, locale)} –{" "}
                                  {formatDate(quote.return_date, locale)} · {quote.reference}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="font-semibold tabular-nums text-tquot-teal">
                                  {formatPrice(
                                    quote.total_public_price,
                                    quote.currency,
                                    locale,
                                  )}
                                </p>
                                <a
                                  href={`/api/quotes/${quote.id}/pdf?variant=client`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-lg border border-tquot-border px-3 py-2 text-sm font-medium text-tquot-text transition-colors hover:border-tquot-accent hover:text-tquot-accent"
                                >
                                  {t.viewPdf}
                                </a>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

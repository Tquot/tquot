"use client";

import Link from "next/link";
import type {
  ComparatorOutput,
  ComparatorResultRow,
} from "@/lib/comparator";
import { providerSlug } from "@/lib/connectors/provider-logo";
import type { ParsedTripInput, Quote, QuoteItem } from "@/lib/quotes/build-quote";
import { ProviderLogo } from "@/app/components/provider-logo";
import { useDashboardLanguage } from "../dashboard-language-provider";
import type { DashboardTranslation } from "../translations";
import type { Locale } from "../translations";
import { formatCurrency } from "./quote-shared";
import type { HotelDetails, HotelProvider } from "@/lib/quote-engine/types";

export type CompareHotelState = {
  itemId: string;
  hotel: HotelDetails;
} | null;

export function quoteItemToHotelDetails(item: QuoteItem): HotelDetails | null {
  const details = item.hotelDetails;
  if (!details) return null;

  const slug = providerSlug(details.providerId ?? item.provider);
  const provider: HotelProvider =
    details.provider ??
    (slug === "booking" || slug === "expedia" ? slug : "hotelbeds");

  const netPrice = details.netPrice ?? item.price;
  if (!Number.isFinite(netPrice) || netPrice <= 0) return null;

  const name = item.title.split(" — ")[0]?.trim() || item.title;

  return {
    id: item.id,
    name,
    provider,
    netPrice,
    currency: details.currency ?? "EUR",
    rateKey: details.rateKey,
    fetchedAt: details.fetchedAt ?? new Date().toISOString(),
    hotelCode: details.hotelCode,
    providerId: details.providerId,
    connectionId: details.connectionId,
  };
}

const HOTEL_PROVIDER_CATEGORY = "hotels";

export type CatalogProviderEntry = {
  providerId: string;
  providerName: string;
  connected: boolean;
  connectionId?: string;
  logoUrl: string | null;
  netPrice?: number;
};

export type ComparatorPanelState = {
  itemId: string;
  loading: boolean;
  error: string | null;
  results: ComparatorOutput | null;
  catalogProviders: CatalogProviderEntry[];
};

export function comparatorStatusLabel(
  row: ComparatorResultRow,
  t: DashboardTranslation,
): string {
  if (row.status === "ok") return t.comparatorAvailable;
  if (row.status === "no_results") return t.comparatorNoResults;
  if (row.status === "timeout") return t.comparatorTimeout;
  return row.errorMessage ?? t.comparatorGenericError;
}

export function comparatorRowForProvider(
  results: ComparatorOutput | null,
  providerId: string,
): ComparatorResultRow | undefined {
  const slug = providerSlug(providerId);
  return results?.results.find((row) => providerSlug(row.providerId) === slug);
}

export function mergeComparatorRows(
  baseResults: ComparatorOutput | null,
  extraRows: ComparatorResultRow[],
): ComparatorOutput | null {
  if (!baseResults && extraRows.length === 0) return null;

  const results = [...(baseResults?.results ?? []), ...extraRows];
  const statusOrder: Record<ComparatorResultRow["status"], number> = {
    ok: 0,
    no_results: 1,
    timeout: 2,
    error: 3,
  };
  const sorted = [...results].sort((a, b) => {
    const orderDiff = statusOrder[a.status] - statusOrder[b.status];
    if (orderDiff !== 0) return orderDiff;
    if (a.status === "ok" && b.status === "ok") {
      return (a.bestRoom?.netPrice ?? 0) - (b.bestRoom?.netPrice ?? 0);
    }
    return 0;
  });

  const cheapest =
    sorted.find((row) => row.status === "ok" && row.bestRoom) ?? null;

  return {
    results: sorted,
    cheapest,
    totalElapsedMs: baseResults?.totalElapsedMs ?? 0,
    summary: {
      consulted: sorted.length,
      ok: sorted.filter((row) => row.status === "ok").length,
      errors: sorted.filter((row) => row.status === "error").length,
      timeouts: sorted.filter((row) => row.status === "timeout").length,
      noResults: sorted.filter((row) => row.status === "no_results").length,
    },
  };
}

export async function fetchHotelComparatorPanel(params: {
  quote: Quote;
  tripInput: ParsedTripInput;
  itemId: string;
  t: DashboardTranslation;
}): Promise<ComparatorPanelState> {
  const { quote, tripInput, itemId, t } = params;
  const item = quote.hotels.find((entry) => entry.id === itemId);

  if (!item?.hotelDetails) {
    return {
      itemId,
      loading: false,
      error: t.comparatorNoHotelDetails,
      results: null,
      catalogProviders: [],
    };
  }

  const hotelCode = item.hotelDetails.hotelCode;

  try {
    const [catalogResponse, connectionsResponse] = await Promise.all([
      fetch("/api/connectors/catalog"),
      fetch("/api/connectors/connections"),
    ]);

    const catalogPayload = (await catalogResponse.json()) as {
      providers?: Array<{
        id: string;
        name: string;
        category: string;
        logo_url: string | null;
      }>;
      error?: string;
    };
    const connectionsPayload = (await connectionsResponse.json()) as {
      connections?: Array<{ id: string; provider_id: string }>;
      error?: string;
    };

    if (!catalogResponse.ok) {
      throw new Error(catalogPayload.error ?? t.comparatorGenericError);
    }
    if (!connectionsResponse.ok) {
      throw new Error(connectionsPayload.error ?? t.comparatorGenericError);
    }

    const connectionsByProvider = new Map<
      string,
      { id: string; provider_id: string }
    >();
    for (const connection of connectionsPayload.connections ?? []) {
      const slug = providerSlug(connection.provider_id);
      if (slug && !connectionsByProvider.has(slug)) {
        connectionsByProvider.set(slug, connection);
      }
    }

    const hotelCatalog = (catalogPayload.providers ?? []).filter(
      (provider) => provider.category === HOTEL_PROVIDER_CATEGORY,
    );

    const catalogProviders: CatalogProviderEntry[] = hotelCatalog.map(
      (provider) => {
        const slug = providerSlug(provider.id);
        const connection = connectionsByProvider.get(slug);
        const isHotelbedsProvider = slug === providerSlug("hotelbeds");
        return {
          providerId: provider.id,
          providerName: provider.name,
          connected: Boolean(connection),
          connectionId: connection?.id,
          logoUrl: provider.logo_url,
          ...(isHotelbedsProvider &&
          Number.isFinite(item.hotelDetails?.netPrice)
            ? { netPrice: item.hotelDetails!.netPrice! }
            : {}),
        };
      },
    );

    let results: ComparatorOutput | null = null;
    let error: string | null = null;
    const localRows: ComparatorResultRow[] = [];

    const hotelMappings = catalogProviders
      .filter(
        (provider) =>
          provider.connected &&
          provider.connectionId &&
          providerSlug(provider.providerId) !== providerSlug("hotelbeds"),
      )
      .map((provider) => ({
        connectionId: provider.connectionId!,
        hotelCodes: hotelCode ? [hotelCode] : [],
      }))
      .filter((mapping) => mapping.hotelCodes.length > 0);

    const hotelbedsProvider = catalogProviders.find(
      (provider) =>
        provider.connected &&
        providerSlug(provider.providerId) === providerSlug("hotelbeds"),
    );
    if (
      hotelbedsProvider &&
      Number.isFinite(hotelbedsProvider.netPrice) &&
      hotelbedsProvider.netPrice! > 0
    ) {
      localRows.push({
        providerId: hotelbedsProvider.providerId,
        providerName: hotelbedsProvider.providerName,
        status: "ok",
        elapsedMs: 0,
        bestRoom: {
          roomType: item.title,
          boardType: "UNSPECIFIED",
          netPrice: hotelbedsProvider.netPrice!,
          publicPrice: null,
          currency: "EUR",
          refundable: true,
          providerRoomCode: item.hotelDetails?.rateKey ?? "",
        },
      });
    }

    if (!hotelCode) {
      error = t.comparatorNoConnection;
    } else if (hotelMappings.length > 0) {
      try {
        const response = await fetch("/api/comparator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hotelMappings,
            checkIn: tripInput.dates.start,
            checkOut: tripInput.dates.end,
            rooms: [
              {
                adults: quote.summary.passengers.adults,
                childrenAges: [],
              },
            ],
          }),
        });

        const data = (await response.json()) as ComparatorOutput & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? t.comparatorGenericError);
        }
        results = data;
      } catch (apiError) {
        error =
          apiError instanceof Error
            ? apiError.message
            : t.comparatorGenericError;
      }
    }

    results = mergeComparatorRows(results, localRows);

    return {
      itemId,
      loading: false,
      error,
      results,
      catalogProviders,
    };
  } catch (compareError) {
    return {
      itemId,
      loading: false,
      error:
        compareError instanceof Error
          ? compareError.message
          : t.comparatorGenericError,
      results: null,
      catalogProviders: [],
    };
  }
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function HotelComparatorPanel({
  item,
  panel,
  locale,
  onClose,
  onSelectPrice,
}: {
  item: QuoteItem | null;
  panel: ComparatorPanelState;
  locale: Locale;
  onClose: () => void;
  onSelectPrice: (row: ComparatorResultRow) => void;
}) {
  const { t } = useDashboardLanguage();
  const cheapestProviderId = panel.results?.cheapest?.providerId;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label={t.comparatorClose}
        onClick={onClose}
        className="absolute inset-0 bg-tquot-text/40"
      />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-tquot-border bg-tquot-surface p-5 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-tquot-teal">
              {t.comparatorTitle}
            </p>
            <h3 className="mt-1 text-lg font-bold text-tquot-text">
              {item?.title ?? t.itemTypeHotel}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.comparatorClose}
            className="shrink-0 rounded-lg p-1.5 text-tquot-muted transition-colors hover:bg-tquot-bg hover:text-tquot-text"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {panel.loading ? (
          <p className="py-8 text-center text-sm text-tquot-muted">
            {t.comparatorLoading}
          </p>
        ) : null}

        {panel.error ? (
          <p className="mb-3 rounded-xl border border-tquot-warm/30 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {panel.error}
          </p>
        ) : null}

        {!panel.loading && panel.catalogProviders.length > 0 ? (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {panel.catalogProviders.map((provider) => {
              const row = provider.connected
                ? comparatorRowForProvider(panel.results, provider.providerId)
                : undefined;
              const isCheapest =
                Boolean(row) &&
                row!.status === "ok" &&
                providerSlug(row!.providerId) ===
                  providerSlug(cheapestProviderId ?? "");
              const liveNetPrice =
                row?.status === "ok" && row.bestRoom
                  ? row.bestRoom.netPrice
                  : null;
              const statusLabel = !provider.connected
                ? t.comparatorNotConnected
                : row
                  ? comparatorStatusLabel(row, t)
                  : t.comparatorNoResults;

              return (
                <div
                  key={provider.providerId}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
                    isCheapest
                      ? "border-tquot-teal/40 bg-tquot-teal/10"
                      : "border-tquot-border bg-tquot-bg"
                  }`}
                >
                  <ProviderLogo
                    key={provider.providerId}
                    providerId={provider.providerId}
                    name={provider.providerName}
                    imageClassName="h-10 w-10 shrink-0 rounded object-contain bg-tquot-surface"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-tquot-text">
                        {provider.providerName}
                      </p>
                      {isCheapest ? (
                        <span className="rounded-full border border-tquot-teal/35 bg-tquot-teal/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tquot-teal">
                          {t.comparatorCheapest}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-tquot-muted">{statusLabel}</p>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-tquot-text">
                    {provider.connected && liveNetPrice != null
                      ? formatCurrency(liveNetPrice, locale)
                      : "—"}
                  </p>
                  {!provider.connected ? (
                    <Link
                      href="/dashboard/integrations"
                      className="rounded-lg border border-tquot-border bg-tquot-surface px-3 py-1.5 text-xs font-bold text-tquot-accent hover:bg-tquot-bg"
                    >
                      {t.comparatorConnect}
                    </Link>
                  ) : row?.status === "ok" && row.bestRoom ? (
                    <button
                      type="button"
                      onClick={() => onSelectPrice(row)}
                      className="rounded-lg border border-tquot-teal/30 bg-tquot-teal/10 px-3 py-1.5 text-xs font-bold text-tquot-teal hover:bg-tquot-teal/15"
                    >
                      {t.useThisPrice}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-tquot-border bg-tquot-surface px-4 py-3 text-sm font-semibold text-tquot-text transition-colors hover:bg-tquot-bg"
        >
          {t.comparatorClose}
        </button>
      </div>
    </div>
  );
}

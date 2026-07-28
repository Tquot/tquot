"use client";

import type { ReactNode } from "react";
import type { BuildProgress, QuoteSection } from "@/lib/quote-engine/types";
import type {
  ParsedTripInput,
  Quote,
  QuoteDataSource,
} from "@/lib/quotes/build-quote";
import { useDashboardLanguage } from "../../dashboard-language-provider";
import { formatMessage } from "../../format-message";
import { FlightQuoteItemsSection, QuoteItemsSection } from "../quote-results";
import {
  DataSourceBadge,
  SectionSkeleton,
  TotalCard,
} from "../quote-shared";
import { BookingHandoffLegSection } from "@/components/quote-canvas/LegBlock";
import { RecommendationsSection } from "@/components/quote-conversation/canvas/RecommendationsSection";
import {
  BuildProgress as BuildProgressUI,
  type SectionProgress,
} from "@/components/canvas/BuildProgress";
import type { Quote as EngineQuote } from "@/lib/quote-engine/types";
import type { useQuoteItemHandlers } from "../use-quote-item-handlers";
import type { SectionStatus } from "@/lib/quote-conversation/types";

type QuoteCanvasProps = {
  status: string;
  parsingPartial: Partial<ParsedTripInput> | null;
  buildProgress: BuildProgress | null;
  quote: Partial<Quote> | Quote | null;
  isBuilding: boolean;
  handlers: ReturnType<typeof useQuoteItemHandlers>;
};

function sectionItems(
  quote: Partial<Quote> | null,
  section: QuoteSection,
): Quote["flights"] {
  if (!quote) return [];
  switch (section) {
    case "flights":
      return quote.flights ?? [];
    case "hotels":
      return quote.hotels ?? [];
    case "experiences":
      return quote.experiences ?? [];
    case "transfers":
      return quote.transfers ?? [];
  }
}

function isCompleteQuote(quote: Partial<Quote> | Quote | null): quote is Quote {
  return Boolean(quote && quote.pricing && quote.summary && quote.id);
}

function mapSectionStatus(status: SectionStatus | undefined): SectionProgress["status"] {
  if (!status) return "pending";
  switch (status.kind) {
    case "searching":
    case "partial":
      return "searching";
    case "done":
      return "done";
    case "error":
      return status.skipped ? "skipped" : "error";
    case "pending":
    default:
      return "pending";
  }
}

function buildProgressSections(
  buildProgress: BuildProgress | null,
  quote: Partial<Quote> | Quote | null,
  parsingPartial: Partial<ParsedTripInput> | null,
): SectionProgress[] {
  const legProgress = buildProgress
    ? Object.values(buildProgress)[0]
    : undefined;
  const detail =
    parsingPartial?.origin && parsingPartial?.destination
      ? `${parsingPartial.origin} → ${parsingPartial.destination}`
      : parsingPartial?.destination;

  const defs: Array<{
    key: QuoteSection;
    label: string;
    detail?: string;
  }> = [
    { key: "flights", label: "Vuelos", detail },
    {
      key: "hotels",
      label: "Hoteles",
      detail: parsingPartial?.destination,
    },
    {
      key: "experiences",
      label: "Experiencias",
      detail: parsingPartial?.destination,
    },
    { key: "transfers", label: "Traslados" },
  ];

  return defs.map((def) => {
    const progress = legProgress?.[def.key];
    const items = sectionItems(quote, def.key);
    const status = mapSectionStatus(progress);
    return {
      key: def.key,
      label: def.label,
      status:
        status === "pending" && items.length > 0 ? "done" : status,
      resultCount: items.length > 0 ? items.length : undefined,
      detail: def.detail,
    };
  });
}

export function QuoteCanvas({
  status,
  parsingPartial,
  buildProgress,
  quote,
  isBuilding,
  handlers,
}: QuoteCanvasProps) {
  const { locale, t } = useDashboardLanguage();

  if (status === "idle") {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <p className="font-serif text-h2 text-ink">{t.newQuote}</p>
          <p className="mt-2 text-body-sm text-text-2">{t.quoteEngineSubtitle}</p>
        </div>
      </div>
    );
  }

  if (status === "parsing" || status === "needs_input") {
    return (
      <div className="space-y-4">
        <BuildProgressUI
          sections={buildProgressSections(null, null, parsingPartial)}
        />
        <div className="rounded-lg border border-border-1 bg-paper p-4 text-body-sm">
          <p>
            <span className="text-text-2">{t.destination}:</span>{" "}
            {parsingPartial?.destination ?? "—"}
          </p>
          <p className="mt-2">
            <span className="text-text-2">{t.origin}:</span>{" "}
            {parsingPartial?.origin ?? "—"}
          </p>
          <p className="mt-2">
            <span className="text-text-2">
              {locale === "es" ? "Fechas" : "Dates"}:
            </span>{" "}
            {parsingPartial?.dates
              ? `${parsingPartial.dates.start} → ${parsingPartial.dates.end}`
              : "—"}
          </p>
        </div>
      </div>
    );
  }

  if (status === "awaiting_airports") {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-body-sm text-text-2">
        {locale === "es"
          ? "Confirma los aeropuertos en el chat para continuar."
          : "Confirm airports in the chat to continue."}
      </div>
    );
  }

  const showSkeleton = isBuilding && status === "building";
  const completeQuote = isCompleteQuote(quote) ? quote : null;
  const progressSections = buildProgressSections(
    buildProgress,
    quote,
    parsingPartial,
  );

  const sections: Array<{
    key: QuoteSection;
    eyebrow: string;
    title: string;
    metaKey: keyof Quote["_meta"];
    render: () => ReactNode;
  }> = [
    {
      key: "flights",
      eyebrow: t.sectionFlightsEyebrow,
      title: t.sectionFlightsTitle,
      metaKey: "flightsSource",
      render: () => (
        <FlightQuoteItemsSection
          eyebrow={t.sectionFlightsEyebrow}
          title={t.sectionFlightsTitle}
          items={sectionItems(quote, "flights")}
          passengerCount={
            completeQuote?.summary.passengers.adults ??
            parsingPartial?.passengers?.adults ??
            2
          }
          onSelectItem={handlers.handleSelectQuoteItem}
          onMarginChange={handlers.handleQuoteItemMarginChange}
          onFlightFareSelect={handlers.handleFlightFareSelect}
        />
      ),
    },
    {
      key: "transfers",
      eyebrow: t.sectionTransfersEyebrow,
      title: t.sectionTransfersTitle,
      metaKey: "transfersSource",
      render: () => (
        <QuoteItemsSection
          eyebrow={t.sectionTransfersEyebrow}
          title={t.sectionTransfersTitle}
          items={sectionItems(quote, "transfers")}
          selectionMode="independent"
          onToggleItem={handlers.handleToggleTransferItem}
          onMarginChange={handlers.handleQuoteItemMarginChange}
        />
      ),
    },
    {
      key: "hotels",
      eyebrow: t.sectionHotelsEyebrow,
      title: t.sectionHotelsTitle,
      metaKey: "hotelsSource",
      render: () => (
        <QuoteItemsSection
          eyebrow={t.sectionHotelsEyebrow}
          title={t.sectionHotelsTitle}
          items={sectionItems(quote, "hotels")}
          onSelectItem={handlers.handleSelectQuoteItem}
          onMarginChange={handlers.handleQuoteItemMarginChange}
          onCompareItem={handlers.handleCompareHotel}
          onBoardPriceChange={handlers.handleHotelBoardChange}
        />
      ),
    },
    {
      key: "experiences",
      eyebrow: t.sectionExperiencesEyebrow,
      title: t.sectionExperiencesTitle,
      metaKey: "experiencesSource",
      render: () => (
        <QuoteItemsSection
          eyebrow={t.sectionExperiencesEyebrow}
          title={t.sectionExperiencesTitle}
          items={sectionItems(quote, "experiences")}
          selectionMode="independent"
          onToggleItem={handlers.handleToggleExperienceItem}
          onMarginChange={handlers.handleQuoteItemMarginChange}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {(status === "building" || isBuilding) && (
        <div className="rounded-lg border border-border-1 bg-paper px-4">
          <BuildProgressUI sections={progressSections} />
        </div>
      )}

      {sections.map((section) => {
        const legProgress = buildProgress
          ? Object.values(buildProgress)[0]
          : undefined;
        const progress = legProgress?.[section.key];
        const items = sectionItems(quote, section.key);
        const searching =
          showSkeleton &&
          progress &&
          (progress.kind === "pending" || progress.kind === "searching");

        if (searching && items.length === 0) {
          return <SectionSkeleton key={section.key} title={section.title} />;
        }

        if (items.length === 0 && status === "building") {
          return null;
        }

        if (items.length === 0) {
          return null;
        }

        return (
          <div key={section.key}>
            {completeQuote ? (
              <DataSourceBadge
                source={
                  (completeQuote._meta[section.metaKey] ??
                    "mock") as QuoteDataSource
                }
              />
            ) : null}
            {section.render()}
          </div>
        );
      })}

      {completeQuote ? <BookingHandoffLegSection /> : null}

      {completeQuote &&
      (completeQuote as EngineQuote).recommendations &&
      (completeQuote as EngineQuote).recommendations!.length > 0 ? (
        <RecommendationsSection
          recommendations={(completeQuote as EngineQuote).recommendations!}
        />
      ) : null}

      {completeQuote ? (
        <div className="grid gap-4 rounded-lg border border-border-1 bg-paper p-5 sm:grid-cols-3 sm:divide-x sm:divide-border-1">
          <TotalCard
            label={t.baseTotal}
            value={completeQuote.pricing.baseTotal}
            locale={locale}
            currency={completeQuote.pricing.currency}
          />
          <TotalCard
            label={t.margin}
            value={completeQuote.pricing.margin}
            locale={locale}
            currency={completeQuote.pricing.currency}
          />
          <TotalCard
            label={formatMessage(t.finalTotal, {
              currency: completeQuote.pricing.currency,
            })}
            value={completeQuote.pricing.finalTotal}
            highlight
            locale={locale}
            currency={completeQuote.pricing.currency}
          />
        </div>
      ) : null}
    </div>
  );
}

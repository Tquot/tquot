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
import type { Quote as EngineQuote } from "@/lib/quote-engine/types";
import type { useQuoteItemHandlers } from "../use-quote-item-handlers";

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
          <p className="text-lg font-semibold text-tquot-text">{t.newQuote}</p>
          <p className="mt-2 text-sm text-tquot-muted">{t.quoteEngineSubtitle}</p>
        </div>
      </div>
    );
  }

  if (status === "parsing" || status === "needs_input") {
    return (
      <div className="p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-tquot-teal">
          {t.stepParseTitle}
        </h3>
        <div className="space-y-3 rounded-xl border border-tquot-border bg-tquot-surface p-4 text-sm">
          <p>
            <span className="font-medium text-tquot-muted">{t.destination}:</span>{" "}
            {parsingPartial?.destination ?? "—"}
          </p>
          <p>
            <span className="font-medium text-tquot-muted">{t.origin}:</span>{" "}
            {parsingPartial?.origin ?? "—"}
          </p>
          <p>
            <span className="font-medium text-tquot-muted">
              {locale === "es" ? "Fechas" : "Dates"}:
            </span>{" "}
            {parsingPartial?.dates
              ? `${parsingPartial.dates.start} → ${parsingPartial.dates.end}`
              : "—"}
          </p>
          <p>
            <span className="font-medium text-tquot-muted">
              {locale === "es" ? "Viajeros" : "Travelers"}:
            </span>{" "}
            {parsingPartial?.passengers
              ? `${parsingPartial.passengers.adults} adults${
                  parsingPartial.passengers.children
                    ? `, ${parsingPartial.passengers.children} children`
                    : ""
                }`
              : "—"}
          </p>
        </div>
      </div>
    );
  }

  if (status === "awaiting_airports") {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-tquot-muted">
        {locale === "es"
          ? "Confirma los aeropuertos en el chat para continuar."
          : "Confirm airports in the chat to continue."}
      </div>
    );
  }

  const showSkeleton = isBuilding && status === "building";
  const completeQuote = isCompleteQuote(quote) ? quote : null;

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
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {sections.map((section) => {
          const progress = buildProgress?.[section.key];
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
          <div className="grid gap-4 rounded-xl border border-tquot-border bg-gradient-to-r from-tquot-teal/5 to-slate-50 p-5 shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-tquot-border">
            <TotalCard
              label={t.baseTotal}
              value={completeQuote.pricing.baseTotal}
              locale={locale}
            />
            <TotalCard
              label={t.margin}
              value={completeQuote.pricing.margin}
              locale={locale}
            />
            <TotalCard
              label={formatMessage(t.finalTotal, {
                currency: completeQuote.pricing.currency,
              })}
              value={completeQuote.pricing.finalTotal}
              highlight
              locale={locale}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import type {
  QuoteItem,
  QuoteItemSource,
} from "@/lib/quotes/build-quote";
import { getItemMarginPercent, getQuoteSelectionGroup } from "@/lib/quotes/build-quote";
import { useDashboardLanguage } from "../dashboard-language-provider";
import { formatMessage } from "../format-message";
import type { Locale } from "../translations";
import type { DashboardTranslation } from "../translations";
import { useState } from "react";

const sourceStyles: Record<QuoteItemSource, string> = {
  mock: "border-tquot-warm/30 bg-amber-50 text-tquot-warm",
  inventory: "border-tquot-teal/30 bg-tquot-teal/10 text-tquot-teal",
  api: "border-tquot-accent/30 bg-blue-50 text-tquot-accent",
};

const sourceLabels: Record<QuoteItemSource, string> = {
  mock: "Ejemplo",
  inventory: "Propio",
  api: "Web",
};

const sourceLeftAccent: Record<QuoteItemSource, string> = {
  mock: "",
  inventory: "border-l-4 border-l-tquot-teal",
  api: "border-l-4 border-l-tquot-accent",
};

const quoteCardShell =
  "rounded-xl border p-4 shadow-md transition-all duration-200";

function quoteCardClass({
  isSelected,
  isSelectable,
  isInteractive = true,
  extra = "",
}: {
  isSelected: boolean;
  isSelectable: boolean;
  isInteractive?: boolean;
  extra?: string;
}) {
  if (isSelected) {
    return `${quoteCardShell} border-2 border-tquot-teal bg-gradient-to-r from-tquot-teal/5 to-white ring-1 ring-tquot-teal/25 ${extra}`;
  }
  if (isSelectable && isInteractive) {
    return `${quoteCardShell} cursor-pointer border-tquot-border bg-gradient-to-r from-white to-slate-50/50 hover:border-tquot-teal/40 ${extra}`;
  }
  return `${quoteCardShell} border-tquot-border bg-gradient-to-r from-white to-slate-50/50 ${extra}`;
}

const priceBreakdownClass =
  "mt-3 grid grid-cols-3 gap-2 border-t border-tquot-border bg-slate-50/80 pt-3 text-xs";

function formatCurrency(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function pluralSuffix(locale: Locale, count: number) {
  if (locale === "en") {
    return count === 1 ? "" : "s";
  }
  return count === 1 ? "" : "es";
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 rounded-lg bg-white/60 p-3 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-tquot-teal">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-lg font-bold text-tquot-text">{title}</h3>
      <div
        className="mt-2 h-0.5 w-full max-w-[12rem] bg-tquot-teal"
        aria-hidden
      />
      <p className="mt-2 text-xs leading-5 text-tquot-muted">{subtitle}</p>
    </div>
  );
}

function AirlineLogo({ airline, logoUrl }: { airline: string; logoUrl: string }) {
  const [failed, setFailed] = useState(false);
  const initial = airline.trim().charAt(0).toUpperCase() || "?";

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={airline}
        onError={() => setFailed(true)}
        className="h-10 w-10 rounded-full border border-tquot-border bg-tquot-surface object-contain p-1 shadow-sm"
      />
    );
  }

  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-tquot-border bg-tquot-surface text-sm font-bold text-tquot-teal shadow-sm">
      {initial}
    </span>
  );
}

function FlightQuoteItemCard({
  item,
  passengerCount = 1,
  onSelect,
  onMarginChange,
}: {
  item: QuoteItem;
  passengerCount?: number;
  onSelect?: (itemId: string) => void;
  onMarginChange?: (itemId: string, marginPercent: number) => void;
}) {
  const { locale, t } = useDashboardLanguage();
  const details = item.flightDetails;
  if (!details) {
    return null;
  }
  const selectionGroup = getQuoteSelectionGroup(item.id);
  const isSelectable = selectionGroup !== null && Boolean(onSelect);
  const isIncluded = !item.alternative;
  const isSelected = isSelectable && isIncluded;
  const marginPercent = getItemMarginPercent(item);
  const adults = Math.max(1, passengerCount);
  const pricePerPerson =
    details.priceNumeric > 0
      ? Math.round(details.priceNumeric / adults)
      : Math.round(item.price / adults);
  const isDirect = details.stops === 0;

  return (
    <article
      role={isSelectable && !isSelected ? "button" : undefined}
      tabIndex={isSelectable && !isSelected ? 0 : undefined}
      onClick={() => {
        if (isSelectable && !isSelected) {
          onSelect?.(item.id);
        }
      }}
      onKeyDown={(event) => {
        if (
          isSelectable &&
          !isSelected &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          onSelect?.(item.id);
        }
      }}
      className={quoteCardClass({
        isSelected,
        isSelectable,
      })}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <AirlineLogo airline={details.airline} logoUrl={details.airlineLogoUrl} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-tquot-border bg-tquot-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tquot-muted">
                {t.itemTypeFlight}
              </span>
              {isDirect ? (
                <span className="rounded-full border border-tquot-success/30 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-tquot-success">
                  Directo
                </span>
              ) : null}
              {isSelectable ? (
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                    isSelected
                      ? "border-tquot-teal/30 bg-tquot-teal/10 text-tquot-teal"
                      : "border-tquot-warm/30 bg-amber-50 text-tquot-warm"
                  }`}
                >
                  {isSelected ? t.itemIncluded : t.itemAlternative}
                </span>
              ) : null}
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${sourceStyles[item.source]}`}
              >
                {sourceLabels[item.source]}
              </span>
            </div>
            <p className="text-lg font-bold tracking-wide text-tquot-text">
              {details.originIata} → {details.destinationIata}
            </p>
            <p className="text-sm text-tquot-muted">
              {details.originCity} → {details.destinationCity}
            </p>
            <p className="mt-1 text-sm text-tquot-muted">
              {details.airline} · {details.flightNumber}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-tquot-muted">por persona</p>
          <p className="text-lg font-semibold text-tquot-text">
            {formatCurrency(pricePerPerson, locale)}
          </p>
          <p className="mt-1 text-xs text-tquot-muted">total</p>
          <p
            className={`text-xl font-black ${isSelected || !isSelectable ? "text-tquot-teal" : "text-tquot-muted"}`}
          >
            {formatCurrency(item.finalPrice, locale)}
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-tquot-border bg-slate-50 px-5 py-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-tquot-muted">
              {details.originIata}
            </p>
            <p className="text-3xl font-black tabular-nums text-tquot-text sm:text-4xl">
              {details.departureTime}
            </p>
            <p className="text-xs text-tquot-muted">{details.departureDate}</p>
          </div>
          <div className="flex min-w-[5rem] flex-col items-center gap-1.5 px-1 sm:min-w-[7rem]">
            <div className="flex w-full items-center gap-1">
              <span className="h-2 w-2 shrink-0 rounded-full bg-tquot-teal" />
              <span className="h-px flex-1 bg-tquot-teal" />
              <span className="shrink-0 text-sm text-tquot-teal" aria-hidden>
                ✈
              </span>
              <span className="h-px flex-1 bg-tquot-teal/50" />
              <span className="h-2 w-2 shrink-0 rounded-full border-2 border-tquot-teal bg-transparent" />
            </div>
            <p className="text-sm font-semibold text-tquot-text">{details.duration}</p>
            <p className="text-xs text-tquot-muted">
              {isDirect
                ? "Directo"
                : `${details.stops} escala${details.stops === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-tquot-muted">
              {details.destinationIata}
            </p>
            <p className="text-3xl font-black tabular-nums text-tquot-text sm:text-4xl">
              {details.arrivalTime}
            </p>
          </div>
        </div>
      </div>

      {details.cabinClass || details.baggageIncluded ? (
        <p className="mb-3 text-sm text-tquot-muted">
          {[details.cabinClass, details.baggageIncluded].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      {!isDirect && details.layovers.length > 0 ? (
        <div className="mb-4 space-y-1">
          {details.layovers.map((layover, index) => (
            <p key={`${layover.iata}-${index}`} className="text-sm text-tquot-muted">
              Escala en {layover.airport} ({layover.iata}) · {layover.duration}
            </p>
          ))}
        </div>
      ) : null}

      <div className={priceBreakdownClass}>
        <div>
          <p className="text-tquot-muted">{t.itemBase}</p>
          <p className="font-semibold text-tquot-text">
            {formatCurrency(item.price, locale)}
          </p>
        </div>
        <div>
          <p className="text-tquot-muted">{t.itemMargin}</p>
          <p className="font-semibold text-tquot-warm">
            {formatCurrency(item.markup, locale)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-tquot-muted">{t.itemClient}</p>
          <p className="font-semibold text-tquot-teal">
            {formatCurrency(item.finalPrice, locale)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {onMarginChange ? (
          <label className="flex min-w-[7rem] flex-col gap-1 text-xs">
            <span className="text-tquot-muted">{t.itemMarginPercent}</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={marginPercent}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  onMarginChange(item.id, Number.isFinite(next) ? next : 0);
                }}
                onClick={(event) => event.stopPropagation()}
                className="w-full rounded-xl border border-tquot-border bg-tquot-surface px-3 py-2 text-sm font-semibold text-tquot-text outline-none focus:border-tquot-accent focus:ring-2 focus:ring-tquot-accent/20"
              />
              <span className="text-tquot-muted">%</span>
            </div>
          </label>
        ) : null}

        {isSelectable ? (
          <button
            type="button"
            onClick={() => onSelect?.(item.id)}
            disabled={isSelected}
            className={`ml-auto rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              isSelected
                ? "cursor-default border border-tquot-teal bg-tquot-teal text-white"
                : "border border-tquot-border bg-tquot-surface text-tquot-text hover:border-tquot-teal hover:text-tquot-teal"
            }`}
          >
            {isSelected ? t.itemSelected : t.itemUseInQuote}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function QuoteItemCard({
  item,
  onSelect,
  onToggle,
  onMarginChange,
  onCompare,
  selectionMode = "exclusive",
}: {
  item: QuoteItem;
  onSelect?: (itemId: string) => void;
  onToggle?: (itemId: string) => void;
  onMarginChange?: (itemId: string, marginPercent: number) => void;
  onCompare?: (itemId: string) => void;
  selectionMode?: "exclusive" | "independent";
}) {
  const { locale, t } = useDashboardLanguage();
  const selectionGroup = getQuoteSelectionGroup(item.id);
  const isIndependent = selectionMode === "independent";
  const isSelectable =
    isIndependent ? Boolean(onToggle) : selectionGroup !== null && Boolean(onSelect);
  const isIncluded = !item.alternative;
  const isSelected = isSelectable && isIncluded;
  const marginPercent = getItemMarginPercent(item);
  const showCompareButton =
    item.type === "hotel" && Boolean(item.hotelDetails) && Boolean(onCompare);

  const typeLabels: Record<QuoteItem["type"], string> = {
    flight: t.itemTypeFlight,
    hotel: t.itemTypeHotel,
    experience: t.itemTypeExperience,
  };

  return (
    <article
      role={isSelectable && !isIndependent ? "button" : undefined}
      tabIndex={isSelectable && !isIndependent && !isSelected ? 0 : undefined}
      onClick={() => {
        if (isSelectable && !isIndependent && !isSelected) {
          onSelect?.(item.id);
        }
      }}
      onKeyDown={(event) => {
        if (
          isSelectable &&
          !isIndependent &&
          !isSelected &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          onSelect?.(item.id);
        }
      }}
      className={quoteCardClass({
        isSelected,
        isSelectable,
        isInteractive: !isIndependent,
        extra: sourceLeftAccent[item.source],
      })}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {isIndependent ? (
              <label
                className="flex cursor-pointer items-center gap-2 rounded-full border border-tquot-border bg-tquot-bg px-2.5 py-1"
                onClick={(event) => event.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isIncluded}
                  onChange={() => onToggle?.(item.id)}
                  className="h-4 w-4 rounded accent-tquot-teal"
                />
                <span className="text-xs font-semibold text-tquot-text">
                  {isIncluded ? t.itemIncludeInQuote : t.itemExcluded}
                </span>
              </label>
            ) : null}
            <span className="rounded-full border border-tquot-border bg-tquot-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tquot-muted">
              {typeLabels[item.type]}
            </span>
            {isSelectable && !isIndependent ? (
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  isSelected
                    ? "border-tquot-teal/30 bg-tquot-teal/10 text-tquot-teal"
                    : "border-tquot-warm/30 bg-amber-50 text-tquot-warm"
                }`}
              >
                {isSelected ? t.itemIncluded : t.itemAlternative}
              </span>
            ) : null}
            {isIndependent ? (
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  isIncluded
                    ? "border-tquot-teal/30 bg-tquot-teal/10 text-tquot-teal"
                    : "border-tquot-warm/30 bg-amber-50 text-tquot-warm"
                }`}
              >
                {isIncluded ? t.itemIncluded : t.itemExcluded}
              </span>
            ) : null}
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${sourceStyles[item.source]}`}
            >
              {sourceLabels[item.source]}
            </span>
          </div>
          <h4 className="font-semibold text-tquot-text">{item.title}</h4>
          <p className="mt-1 text-sm text-tquot-muted">{item.provider}</p>
          {item.description ? (
            <p className="mt-2 text-sm leading-relaxed text-tquot-muted">
              {item.description}
            </p>
          ) : null}
        </div>
        <p
          className={`text-xl font-black ${isSelected || !isSelectable ? "text-tquot-teal" : "text-tquot-muted"}`}
        >
          {formatCurrency(item.finalPrice, locale)}
        </p>
      </div>

      <div className={priceBreakdownClass}>
        <div>
          <p className="text-tquot-muted">{t.itemBase}</p>
          <p className="font-semibold text-tquot-text">
            {formatCurrency(item.price, locale)}
          </p>
        </div>
        <div>
          <p className="text-tquot-muted">{t.itemMargin}</p>
          <p className="font-semibold text-tquot-warm">
            {formatCurrency(item.markup, locale)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-tquot-muted">{t.itemClient}</p>
          <p className="font-semibold text-tquot-teal">
            {formatCurrency(item.finalPrice, locale)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {onMarginChange ? (
          <label className="flex min-w-[7rem] flex-col gap-1 text-xs">
            <span className="text-tquot-muted">{t.itemMarginPercent}</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={marginPercent}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  onMarginChange(item.id, Number.isFinite(next) ? next : 0);
                }}
                onClick={(event) => event.stopPropagation()}
                className="w-full rounded-xl border border-tquot-border bg-tquot-surface px-3 py-2 text-sm font-semibold text-tquot-text outline-none focus:border-tquot-accent focus:ring-2 focus:ring-tquot-accent/20"
              />
              <span className="text-tquot-muted">%</span>
            </div>
          </label>
        ) : null}

        {showCompareButton ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onCompare?.(item.id);
            }}
            className="rounded-xl border border-tquot-border bg-tquot-surface px-4 py-2 text-xs font-bold text-tquot-text transition-colors hover:border-tquot-accent hover:text-tquot-accent"
          >
            {t.compareHotelPrices}
          </button>
        ) : null}

        {isSelectable && !isIndependent ? (
          <button
            type="button"
            onClick={() => onSelect?.(item.id)}
            disabled={isSelected}
            className={`ml-auto rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              isSelected
                ? "cursor-default border border-tquot-teal bg-tquot-teal text-white"
                : "border border-tquot-border bg-tquot-surface text-tquot-text hover:border-tquot-teal hover:text-tquot-teal"
            }`}
          >
            {isSelected ? t.itemSelected : t.itemUseInQuote}
          </button>
        ) : null}
      </div>
    </article>
  );
}

type QuoteItemListProps = {
  onSelectItem?: (itemId: string) => void;
  onToggleItem?: (itemId: string) => void;
  onMarginChange?: (itemId: string, marginPercent: number) => void;
  onCompareItem?: (itemId: string) => void;
  selectionMode?: "exclusive" | "independent";
  passengerCount?: number;
};

function isOutboundFlight(item: QuoteItem) {
  return item.id.startsWith("flight-out-");
}

function isReturnFlight(item: QuoteItem) {
  return item.id.startsWith("flight-return-");
}

function splitFlightsByDirection(items: QuoteItem[]) {
  return {
    outbound: items.filter(isOutboundFlight),
    returnFlights: items.filter(isReturnFlight),
    other: items.filter(
      (item) => !isOutboundFlight(item) && !isReturnFlight(item),
    ),
  };
}

function renderQuoteItemList(items: QuoteItem[], props: QuoteItemListProps) {
  const {
    onSelectItem,
    onToggleItem,
    onMarginChange,
    onCompareItem,
    selectionMode = "exclusive",
    passengerCount,
  } = props;

  return items.map((item) =>
    item.type === "flight" && item.flightDetails ? (
      <FlightQuoteItemCard
        key={item.id}
        item={item}
        passengerCount={passengerCount}
        onSelect={onSelectItem}
        onMarginChange={onMarginChange}
      />
    ) : (
      <QuoteItemCard
        key={item.id}
        item={item}
        onSelect={onSelectItem}
        onToggle={onToggleItem}
        onMarginChange={onMarginChange}
        onCompare={onCompareItem}
        selectionMode={selectionMode}
      />
    ),
  );
}

function buildSectionSubtitle(
  items: QuoteItem[],
  selectionMode: "exclusive" | "independent",
  locale: Locale,
  t: DashboardTranslation,
) {
  const isIndependent = selectionMode === "independent";
  const selectableCount = isIndependent
    ? items.length
    : items.filter((item) => getQuoteSelectionGroup(item.id)).length;
  const includedCount = isIndependent
    ? items.filter((item) => !item.alternative).length
    : items.filter(
        (item) => getQuoteSelectionGroup(item.id) && !item.alternative,
      ).length;

  return selectableCount > 0
    ? formatMessage(t.sectionSubtitleSelectable, {
        included: includedCount,
        total: items.length,
        plural: pluralSuffix(locale, items.length),
      })
    : formatMessage(t.sectionSubtitleLines, {
        total: items.length,
        plural: pluralSuffix(locale, items.length),
      });
}

function FlightDirectionGroup({
  heading,
  items,
  ...cardProps
}: QuoteItemListProps & {
  heading: string;
  items: QuoteItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="border-b border-tquot-border pb-2 text-sm font-semibold uppercase tracking-wide text-tquot-text">
        {heading}
      </h4>
      <div className="space-y-3">{renderQuoteItemList(items, cardProps)}</div>
    </div>
  );
}

export function FlightQuoteItemsSection({
  eyebrow,
  title,
  items,
  onSelectItem,
  onMarginChange,
  passengerCount,
}: {
  eyebrow: string;
  title: string;
  items: QuoteItem[];
  onSelectItem?: (itemId: string) => void;
  onMarginChange?: (itemId: string, marginPercent: number) => void;
  passengerCount?: number;
}) {
  const { locale, t } = useDashboardLanguage();
  const { outbound, returnFlights, other } = splitFlightsByDirection(items);
  const cardProps = { onSelectItem, onMarginChange, passengerCount };
  const subtitle = buildSectionSubtitle(items, "exclusive", locale, t);

  return (
    <section>
      <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="space-y-6">
        <FlightDirectionGroup
          heading="Vuelo de ida"
          items={outbound}
          {...cardProps}
        />
        <FlightDirectionGroup
          heading="Vuelo de vuelta"
          items={returnFlights}
          {...cardProps}
        />
        {other.length > 0 ? (
          <div className="space-y-3">{renderQuoteItemList(other, cardProps)}</div>
        ) : null}
      </div>
    </section>
  );
}

export function QuoteItemsSection({
  eyebrow,
  title,
  items,
  onSelectItem,
  onToggleItem,
  onMarginChange,
  onCompareItem,
  selectionMode = "exclusive",
  passengerCount,
}: {
  eyebrow: string;
  title: string;
  items: QuoteItem[];
  onSelectItem?: (itemId: string) => void;
  onToggleItem?: (itemId: string) => void;
  onMarginChange?: (itemId: string, marginPercent: number) => void;
  onCompareItem?: (itemId: string) => void;
  selectionMode?: "exclusive" | "independent";
  passengerCount?: number;
}) {
  const { locale, t } = useDashboardLanguage();
  const subtitle = buildSectionSubtitle(items, selectionMode, locale, t);

  return (
    <section>
      <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="space-y-3">
        {renderQuoteItemList(items, {
          onSelectItem,
          onToggleItem,
          onMarginChange,
          onCompareItem,
          selectionMode,
          passengerCount,
        })}
      </div>
    </section>
  );
}

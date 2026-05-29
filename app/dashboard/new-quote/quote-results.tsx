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
  mock: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  inventory: "border-[#00C9A7]/30 bg-[#00C9A7]/10 text-[#00C9A7]",
  api: "border-purple-400/30 bg-purple-400/10 text-purple-300",
};

const sourceLabels: Record<QuoteItemSource, string> = {
  mock: "Ejemplo",
  inventory: "Propio",
  api: "Web",
};

const sourceLeftAccent: Record<QuoteItemSource, string> = {
  mock: "",
  inventory: "border-l-4 border-l-[#00C9A7]",
  api: "border-l-4 border-l-purple-400",
};

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
    <div className="mb-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#00C9A7]">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-lg font-bold text-white">{title}</h3>
      <div
        className="mt-2 h-px w-full max-w-[12rem] bg-gradient-to-r from-[#00C9A7] via-[#00E5BB]/60 to-transparent"
        aria-hidden
      />
      <p className="mt-2 text-xs leading-5 text-[#8B9CB3]">{subtitle}</p>
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
        className="h-10 w-10 rounded-full border border-white/10 bg-white object-contain p-1"
      />
    );
  }

  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-sm font-bold text-[#00C9A7]">
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
      className={`rounded-3xl border bg-[#03080F]/60 p-4 shadow-[0_16px_44px_rgba(0,0,0,0.24)] transition-all duration-200 ${
        isSelected
          ? "border-[#00C9A7]/55 ring-1 ring-[#00C9A7]/35"
          : isSelectable
            ? "cursor-pointer border-white/[0.08] hover:scale-[1.01] hover:border-[#00C9A7]/25"
            : "border-white/[0.08]"
      }`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <AirlineLogo airline={details.airline} logoUrl={details.airlineLogoUrl} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8B9CB3]">
                {t.itemTypeFlight}
              </span>
              {isDirect ? (
                <span className="rounded-full border border-emerald-400/35 bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                  Directo
                </span>
              ) : null}
              {isSelectable ? (
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                    isSelected
                      ? "border-[#00C9A7]/40 bg-[#00C9A7]/15 text-[#00C9A7]"
                      : "border-amber-400/30 bg-amber-400/10 text-amber-200"
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
            <p className="text-lg font-bold tracking-wide text-white">
              {details.originIata} → {details.destinationIata}
            </p>
            <p className="text-sm text-[#8B9CB3]">
              {details.originCity} → {details.destinationCity}
            </p>
            <p className="mt-1 text-sm text-[#8B9CB3]">
              {details.airline} · {details.flightNumber}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#4A6A85]">por persona</p>
          <p className="text-lg font-bold text-[#E8EEF7]">
            {formatCurrency(pricePerPerson, locale)}
          </p>
          <p className="mt-1 text-xs text-[#4A6A85]">total</p>
          <p
            className={`text-xl font-black ${isSelected || !isSelectable ? "text-[#00C9A7]" : "text-[#8B9CB3]"}`}
          >
            {formatCurrency(item.finalPrice, locale)}
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.04] via-[#00C9A7]/[0.06] to-white/[0.04] px-5 py-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4A6A85]">
              {details.originIata}
            </p>
            <p className="text-3xl font-black tabular-nums text-white sm:text-4xl">
              {details.departureTime}
            </p>
            <p className="text-xs text-[#8B9CB3]">{details.departureDate}</p>
          </div>
          <div className="flex min-w-[5rem] flex-col items-center gap-1.5 px-1 sm:min-w-[7rem]">
            <div className="flex w-full items-center gap-1">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#00C9A7] shadow-[0_0_12px_rgba(0,201,167,0.8)]" />
              <span className="h-px flex-1 bg-gradient-to-r from-[#00C9A7] to-[#00E5BB]/50" />
              <span className="shrink-0 text-sm text-[#00C9A7]" aria-hidden>
                ✈
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-[#00E5BB]/50 to-[#00C9A7]" />
              <span className="h-2 w-2 shrink-0 rounded-full border-2 border-[#00C9A7] bg-transparent" />
            </div>
            <p className="text-sm font-semibold text-[#E8EEF7]">{details.duration}</p>
            <p className="text-xs text-[#8B9CB3]">
              {isDirect
                ? "Directo"
                : `${details.stops} escala${details.stops === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4A6A85]">
              {details.destinationIata}
            </p>
            <p className="text-3xl font-black tabular-nums text-white sm:text-4xl">
              {details.arrivalTime}
            </p>
          </div>
        </div>
      </div>

      {details.cabinClass || details.baggageIncluded ? (
        <p className="mb-3 text-sm text-[#8B9CB3]">
          {[details.cabinClass, details.baggageIncluded].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      {!isDirect && details.layovers.length > 0 ? (
        <div className="mb-4 space-y-1">
          {details.layovers.map((layover, index) => (
            <p key={`${layover.iata}-${index}`} className="text-sm text-[#8B9CB3]">
              Escala en {layover.airport} ({layover.iata}) · {layover.duration}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-[#4A6A85]">{t.itemBase}</p>
          <p className="font-semibold text-[#E8EEF7]">
            {formatCurrency(item.price, locale)}
          </p>
        </div>
        <div>
          <p className="text-[#4A6A85]">{t.itemMargin}</p>
          <p className="font-semibold text-[#F5C518]">
            {formatCurrency(item.markup, locale)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[#4A6A85]">{t.itemClient}</p>
          <p className="font-semibold text-[#00C9A7]">
            {formatCurrency(item.finalPrice, locale)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {onMarginChange ? (
          <label className="flex min-w-[7rem] flex-col gap-1 text-xs">
            <span className="text-[#4A6A85]">{t.itemMarginPercent}</span>
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
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-[#00C9A7]/50"
              />
              <span className="text-[#8B9CB3]">%</span>
            </div>
          </label>
        ) : null}

        {isSelectable ? (
          <button
            type="button"
            onClick={() => onSelect?.(item.id)}
            disabled={isSelected}
            className={`ml-auto rounded-2xl px-4 py-2 text-xs font-bold transition-colors ${
              isSelected
                ? "cursor-default border border-[#00C9A7]/30 bg-[#00C9A7]/10 text-[#00C9A7]"
                : "border border-white/10 bg-white/[0.06] text-[#E8EEF7] hover:border-[#00C9A7]/40 hover:text-[#00C9A7]"
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
      className={`rounded-3xl border bg-[#03080F]/60 p-4 shadow-[0_16px_44px_rgba(0,0,0,0.24)] transition-all duration-200 ${sourceLeftAccent[item.source]} ${
        isSelected
          ? "border-[#00C9A7]/55 ring-1 ring-[#00C9A7]/35"
          : isSelectable && !isIndependent
            ? "cursor-pointer border-white/[0.08] hover:scale-[1.01] hover:border-[#00C9A7]/25"
            : "border-white/[0.08]"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {isIndependent ? (
              <label
                className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1"
                onClick={(event) => event.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isIncluded}
                  onChange={() => onToggle?.(item.id)}
                  className="h-4 w-4 rounded border-white/20 bg-[#03080F]/60 accent-[#00C9A7]"
                />
                <span className="text-xs font-semibold text-[#E8EEF7]">
                  {isIncluded ? t.itemIncludeInQuote : t.itemExcluded}
                </span>
              </label>
            ) : null}
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8B9CB3]">
              {typeLabels[item.type]}
            </span>
            {isSelectable && !isIndependent ? (
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  isSelected
                    ? "border-[#00C9A7]/40 bg-[#00C9A7]/15 text-[#00C9A7]"
                    : "border-amber-400/30 bg-amber-400/10 text-amber-200"
                }`}
              >
                {isSelected ? t.itemIncluded : t.itemAlternative}
              </span>
            ) : null}
            {isIndependent ? (
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  isIncluded
                    ? "border-[#00C9A7]/40 bg-[#00C9A7]/15 text-[#00C9A7]"
                    : "border-amber-400/30 bg-amber-400/10 text-amber-200"
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
          <h4 className="font-semibold text-white">{item.title}</h4>
          <p className="mt-1 text-sm text-[#8B9CB3]">{item.provider}</p>
          {item.description ? (
            <p className="mt-2 text-sm leading-relaxed text-[#8B9CB3]/90">
              {item.description}
            </p>
          ) : null}
        </div>
        <p
          className={`text-xl font-black ${isSelected || !isSelectable ? "text-[#00C9A7]" : "text-[#8B9CB3]"}`}
        >
          {formatCurrency(item.finalPrice, locale)}
        </p>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-[#4A6A85]">{t.itemBase}</p>
          <p className="font-semibold text-[#E8EEF7]">
            {formatCurrency(item.price, locale)}
          </p>
        </div>
        <div>
          <p className="text-[#4A6A85]">{t.itemMargin}</p>
          <p className="font-semibold text-[#F5C518]">
            {formatCurrency(item.markup, locale)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[#4A6A85]">{t.itemClient}</p>
          <p className="font-semibold text-[#00C9A7]">
            {formatCurrency(item.finalPrice, locale)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {onMarginChange ? (
          <label className="flex min-w-[7rem] flex-col gap-1 text-xs">
            <span className="text-[#4A6A85]">{t.itemMarginPercent}</span>
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
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-[#00C9A7]/50"
              />
              <span className="text-[#8B9CB3]">%</span>
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
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold text-[#E8EEF7] transition-colors hover:border-[#00C9A7]/40 hover:text-[#00C9A7]"
          >
            {t.compareHotelPrices}
          </button>
        ) : null}

        {isSelectable && !isIndependent ? (
          <button
            type="button"
            onClick={() => onSelect?.(item.id)}
            disabled={isSelected}
            className={`ml-auto rounded-2xl px-4 py-2 text-xs font-bold transition-colors ${
              isSelected
                ? "cursor-default border border-[#00C9A7]/30 bg-[#00C9A7]/10 text-[#00C9A7]"
                : "border border-white/10 bg-white/[0.06] text-[#E8EEF7] hover:border-[#00C9A7]/40 hover:text-[#00C9A7]"
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
      <h4 className="text-sm font-bold uppercase tracking-wide text-[#E8EEF7]">
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

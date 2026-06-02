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

function AirlineLogo({
  airline,
  logoUrl,
  compact = false,
}: {
  airline: string;
  logoUrl: string;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const initial = airline.trim().charAt(0).toUpperCase() || "?";
  const sizeClass = compact ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={airline}
        onError={() => setFailed(true)}
        className={`${sizeClass} shrink-0 rounded-full border border-tquot-border bg-tquot-surface object-contain p-0.5 shadow-sm`}
      />
    );
  }

  return (
    <span
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full border border-tquot-border bg-tquot-surface font-bold text-tquot-teal shadow-sm`}
    >
      {initial}
    </span>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-tquot-muted transition-transform ${expanded ? "rotate-90" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
    </svg>
  );
}

function flightStopsLabel(
  stops: number,
  locale: Locale,
): string {
  if (stops === 0) {
    return locale === "es" ? "Directo" : "Direct";
  }
  if (locale === "es") {
    return `${stops} escala${stops === 1 ? "" : "s"}`;
  }
  return `${stops} stop${stops === 1 ? "" : "s"}`;
}

type HotelBoardCode = "SA" | "AD" | "MP" | "PC";

const HOTEL_BOARD_CODES: HotelBoardCode[] = ["SA", "AD", "MP", "PC"];

function parseHotelNightsFromTitle(title: string): number {
  const match = title.match(
    /—\s*(\d+)\s+(?:noche|noches|night|nights)\b/i,
  );
  if (!match) return 1;
  const nights = Number.parseInt(match[1], 10);
  return Number.isFinite(nights) && nights > 0 ? nights : 1;
}

function parseHotelRoomTypeFromTitle(title: string): string | null {
  const separator = title.lastIndexOf(" · ");
  if (separator === -1) return null;
  const roomType = title.slice(separator + 3).trim();
  return roomType.length > 0 ? roomType : null;
}

function hotelBoardLabel(
  code: HotelBoardCode,
  t: DashboardTranslation,
): string {
  const labels: Record<HotelBoardCode, string> = {
    SA: t.hotelBoardSA,
    AD: t.hotelBoardAD,
    MP: t.hotelBoardMP,
    PC: t.hotelBoardPC,
  };
  return labels[code];
}

function HotelQuoteItemExpanded({
  item,
  locale,
  t,
  nights,
  roomType,
  board,
  onBoardChange,
  marginPercent,
  isSelectable,
  isIndependent,
  isSelected,
  onSelect,
  onMarginChange,
  onCompare,
}: {
  item: QuoteItem;
  locale: Locale;
  t: DashboardTranslation;
  nights: number;
  roomType: string | null;
  board: HotelBoardCode;
  onBoardChange: (code: HotelBoardCode) => void;
  marginPercent: number;
  isSelectable: boolean;
  isIndependent: boolean;
  isSelected: boolean;
  onSelect?: (itemId: string) => void;
  onMarginChange?: (itemId: string, marginPercent: number) => void;
  onCompare?: (itemId: string) => void;
}) {
  const pricePerNight = Math.round(item.price / nights);
  const showCompareButton =
    Boolean(item.hotelDetails) && Boolean(onCompare);

  return (
    <div
      className="mt-3 border-t border-tquot-border pt-3"
      onClick={(event) => event.stopPropagation()}
    >
      {item.description ? (
        <p className="mb-3 text-sm leading-relaxed text-tquot-muted">
          {item.description}
        </p>
      ) : null}

      <fieldset className="mb-4">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-tquot-muted">
          {t.hotelBoardTitle}
        </legend>
        <div className="flex flex-wrap gap-2">
          {HOTEL_BOARD_CODES.map((code) => (
            <button
              key={code}
              type="button"
              title={hotelBoardLabel(code, t)}
              onClick={() => onBoardChange(code)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                board === code
                  ? "border-tquot-teal bg-tquot-teal/10 text-tquot-teal"
                  : "border-tquot-border bg-tquot-surface text-tquot-muted hover:border-tquot-teal/40 hover:text-tquot-text"
              }`}
            >
              {code}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-tquot-muted">{hotelBoardLabel(board, t)}</p>
      </fieldset>

      <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-tquot-muted">{t.hotelRoomType}</dt>
          <dd className="font-medium text-tquot-text">
            {roomType ?? t.hotelRoomTypeUnknown}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-tquot-muted">{t.hotelPricePerNight}</dt>
          <dd className="font-semibold tabular-nums text-tquot-text">
            {formatCurrency(pricePerNight, locale)}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-tquot-muted">{t.hotelPriceTotalStay}</dt>
          <dd className="font-semibold tabular-nums text-tquot-text">
            {formatCurrency(item.price, locale)}
          </dd>
        </div>
      </dl>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-tquot-border bg-tquot-bg px-2.5 py-1 text-xs font-semibold text-tquot-text">
          {item.provider}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${sourceStyles[item.source]}`}
        >
          {sourceLabels[item.source]}
        </span>
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

      <div className="mt-3 flex flex-wrap items-end gap-3">
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
                className="w-full rounded-xl border border-tquot-border bg-tquot-surface px-3 py-2 text-sm font-semibold text-tquot-text outline-none focus:border-tquot-accent focus:ring-2 focus:ring-tquot-accent/20"
              />
              <span className="text-tquot-muted">%</span>
            </div>
          </label>
        ) : null}

        {showCompareButton ? (
          <button
            type="button"
            onClick={() => onCompare?.(item.id)}
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
    </div>
  );
}

function HotelQuoteItemCard({
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
  const [expanded, setExpanded] = useState(false);
  const [board, setBoard] = useState<HotelBoardCode>("SA");
  const selectionGroup = getQuoteSelectionGroup(item.id);
  const isIndependent = selectionMode === "independent";
  const isSelectable =
    isIndependent ? Boolean(onToggle) : selectionGroup !== null && Boolean(onSelect);
  const isIncluded = !item.alternative;
  const isSelected = isSelectable && isIncluded;
  const marginPercent = getItemMarginPercent(item);
  const nights = parseHotelNightsFromTitle(item.title);
  const roomType = parseHotelRoomTypeFromTitle(item.title);

  const typeLabels: Record<QuoteItem["type"], string> = {
    flight: t.itemTypeFlight,
    hotel: t.itemTypeHotel,
    experience: t.itemTypeExperience,
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={() => setExpanded((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded((current) => !current);
        }
      }}
      className={quoteCardClass({
        isSelected,
        isSelectable,
        isInteractive: true,
        extra: `${sourceLeftAccent[item.source]}${expanded ? " border-l-4 border-l-tquot-teal/60" : ""}`,
      })}
    >
      <div className="mb-3 overflow-hidden rounded-lg border border-tquot-border bg-tquot-bg">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="h-32 w-full object-cover"
          />
        ) : (
          <div
            className="flex h-32 w-full items-center justify-center text-4xl"
            aria-hidden
          >
            🏨
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <ChevronIcon expanded={expanded} />
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
              {typeLabels.hotel}
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
        </div>
        <p
          className={`text-xl font-black ${isSelected || !isSelectable ? "text-tquot-teal" : "text-tquot-muted"}`}
        >
          {formatCurrency(item.finalPrice, locale)}
        </p>
      </div>

      {expanded ? (
        <HotelQuoteItemExpanded
          item={item}
          locale={locale}
          t={t}
          nights={nights}
          roomType={roomType}
          board={board}
          onBoardChange={setBoard}
          marginPercent={marginPercent}
          isSelectable={isSelectable}
          isIndependent={isIndependent}
          isSelected={isSelected}
          onSelect={onSelect}
          onMarginChange={onMarginChange}
          onCompare={onCompare}
        />
      ) : null}
    </article>
  );
}

function FlightTableExpandedDetails({
  item,
  marginPercent,
  passengerCount = 1,
  onMarginChange,
  onFlightFareSelect,
}: {
  item: QuoteItem;
  marginPercent: number;
  passengerCount?: number;
  onMarginChange?: (itemId: string, marginPercent: number) => void;
  onFlightFareSelect?: (itemId: string, offerId: string) => void;
}) {
  const { locale, t } = useDashboardLanguage();
  const details = item.flightDetails!;
  const isDirect = details.stops === 0;
  const adults = Math.max(1, passengerCount);
  const selectedOfferId =
    details.selectedOfferId ?? details.primaryOfferId ?? "";

  const fareChoices: Array<{
    offerId: string;
    fareName: string;
    priceNumeric: number;
    cabinClass: string;
    baggageIncluded: string;
    isPrimary: boolean;
  }> = [];

  if (details.primaryOfferId) {
    fareChoices.push({
      offerId: details.primaryOfferId,
      fareName: details.primaryFareName ?? details.primaryCabinClass ?? "—",
      priceNumeric: details.primaryPriceNumeric ?? details.priceNumeric,
      cabinClass: details.primaryCabinClass ?? details.cabinClass,
      baggageIncluded:
        details.primaryBaggageIncluded ?? details.baggageIncluded,
      isPrimary: true,
    });
  }

  for (const fare of details.fareOptions ?? []) {
    if (!fare.offerId) continue;
    fareChoices.push({
      offerId: fare.offerId,
      fareName: fare.fareName,
      priceNumeric: fare.priceNumeric,
      cabinClass: fare.cabinClass,
      baggageIncluded: fare.baggageIncluded,
      isPrimary: false,
    });
  }

  const showFareSelector =
    fareChoices.length > 1 && Boolean(onFlightFareSelect);

  return (
    <div
      className="border-t border-tquot-border bg-tquot-bg/60 px-4 py-4"
      onClick={(event) => event.stopPropagation()}
    >
      {details.departureDate ? (
        <p className="mb-2 text-xs text-tquot-muted">{details.departureDate}</p>
      ) : null}

      {showFareSelector ? (
        <fieldset className="mb-4 space-y-2">
          <legend className="text-sm font-semibold text-tquot-text">
            {t.flightFareTitle}
          </legend>
          {fareChoices.map((fare) => (
            <label
              key={fare.offerId}
              className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                selectedOfferId === fare.offerId
                  ? "border-tquot-teal/40 bg-tquot-teal/10"
                  : "border-tquot-border bg-tquot-surface hover:bg-tquot-bg"
              }`}
            >
              <input
                type="radio"
                name={`fare-${item.id}`}
                value={fare.offerId}
                checked={selectedOfferId === fare.offerId}
                onChange={() => onFlightFareSelect?.(item.id, fare.offerId)}
                className="mt-1 accent-tquot-teal"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-tquot-text">{fare.fareName}</span>
                  {fare.isPrimary ? (
                    <span className="rounded-full border border-tquot-teal/30 bg-tquot-teal/10 px-2 py-0.5 text-[10px] font-semibold text-tquot-teal">
                      {t.flightFareBestPrice}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-tquot-muted">
                  {fare.cabinClass} · {fare.baggageIncluded}
                </span>
                <span className="mt-1 block text-sm font-semibold tabular-nums text-tquot-text">
                  {formatCurrency(Math.round(fare.priceNumeric / adults), locale)}
                  <span className="ml-1 text-xs font-normal text-tquot-muted">
                    {locale === "es" ? "por persona" : "per person"}
                  </span>
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : details.cabinClass || details.baggageIncluded ? (
        <p className="mb-2 text-sm text-tquot-muted">
          {[details.cabinClass, details.baggageIncluded].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      {!isDirect && details.layovers.length > 0 ? (
        <div className="mb-3 space-y-1">
          {details.layovers.map((layover, index) => (
            <p key={`${layover.iata}-${index}`} className="text-sm text-tquot-muted">
              {locale === "es" ? "Escala en" : "Layover in"} {layover.airport} (
              {layover.iata}) · {layover.duration}
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

      {onMarginChange ? (
        <label className="mt-3 flex min-w-[7rem] max-w-xs flex-col gap-1 text-xs">
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
              className="w-full rounded-xl border border-tquot-border bg-tquot-surface px-3 py-2 text-sm font-semibold text-tquot-text outline-none focus:border-tquot-accent focus:ring-2 focus:ring-tquot-accent/20"
            />
            <span className="text-tquot-muted">%</span>
          </div>
        </label>
      ) : null}
    </div>
  );
}

type FlightTableRowProps = {
  item: QuoteItem;
  passengerCount?: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelect?: (itemId: string) => void;
  onMarginChange?: (itemId: string, marginPercent: number) => void;
  onFlightFareSelect?: (itemId: string, offerId: string) => void;
};

function FlightTableRow({
  item,
  passengerCount = 1,
  isExpanded,
  onToggleExpand,
  onSelect,
  onMarginChange,
  onFlightFareSelect,
}: FlightTableRowProps) {
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
  const perPersonLabel = locale === "es" ? "por persona" : "per person";

  const rowClass = [
    "cursor-pointer border-b border-tquot-border transition-colors last:border-b-0",
    "hover:bg-tquot-bg/80",
    isSelected ? "border-l-4 border-l-tquot-teal bg-tquot-teal/10" : "bg-tquot-surface",
  ].join(" ");

  return (
    <>
      <tr
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={onToggleExpand}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggleExpand();
          }
        }}
        className={rowClass}
      >
        <td className="px-3 py-3 align-middle sm:px-4">
          <div className="flex items-center gap-2">
            <ChevronIcon expanded={isExpanded} />
            <AirlineLogo
              airline={details.airline}
              logoUrl={details.airlineLogoUrl}
              compact
            />
            <div className="min-w-0">
              <p className="truncate font-semibold text-tquot-text">{details.airline}</p>
              <p className="truncate text-xs text-tquot-muted">{details.flightNumber}</p>
            </div>
          </div>
        </td>
        <td className="px-3 py-3 align-middle sm:px-4">
          <p className="font-semibold tabular-nums text-tquot-text">
            {details.originIata} → {details.destinationIata}
          </p>
          <p className="mt-0.5 text-sm tabular-nums text-tquot-muted">
            {details.departureTime} – {details.arrivalTime}
          </p>
          <p className="mt-0.5 hidden text-xs text-tquot-muted sm:block">
            {details.originCity} → {details.destinationCity}
          </p>
        </td>
        <td className="px-3 py-3 align-middle sm:px-4">
          <p className="font-medium text-tquot-text">{details.duration}</p>
          <span
            className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
              isDirect
                ? "border-tquot-success/30 bg-emerald-50 text-tquot-success"
                : "border-tquot-border bg-tquot-bg text-tquot-muted"
            }`}
          >
            {flightStopsLabel(details.stops, locale)}
          </span>
        </td>
        <td className="px-3 py-3 align-middle sm:px-4">
          <p className="text-xs text-tquot-muted">{perPersonLabel}</p>
          <p className="text-lg font-bold tabular-nums text-tquot-text">
            {formatCurrency(pricePerPerson, locale)}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {isSelectable ? (
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
                  isSelected
                    ? "border-tquot-teal/30 bg-tquot-teal/10 text-tquot-teal"
                    : "border-tquot-warm/30 bg-amber-50 text-tquot-warm"
                }`}
              >
                {isSelected ? t.itemIncluded : t.itemAlternative}
              </span>
            ) : null}
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${sourceStyles[item.source]}`}
            >
              {sourceLabels[item.source]}
            </span>
          </div>
        </td>
        <td
          className="px-3 py-3 align-middle text-right sm:px-4"
          onClick={(event) => event.stopPropagation()}
        >
          {isSelectable ? (
            <button
              type="button"
              onClick={() => onSelect?.(item.id)}
              disabled={isSelected}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                isSelected
                  ? "cursor-default border border-tquot-teal bg-tquot-teal text-white"
                  : "border border-tquot-border bg-tquot-surface text-tquot-text hover:border-tquot-teal hover:text-tquot-teal"
              }`}
            >
              {isSelected ? t.itemSelected : t.itemUseInQuote}
            </button>
          ) : null}
        </td>
      </tr>
      {isExpanded ? (
        <tr className={isSelected ? "bg-tquot-teal/5" : "bg-tquot-bg/40"}>
          <td colSpan={5} className="p-0">
            <FlightTableExpandedDetails
              item={item}
              marginPercent={marginPercent}
              onMarginChange={onMarginChange}
              onFlightFareSelect={onFlightFareSelect}
              passengerCount={passengerCount}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function FlightDirectionTable({
  items,
  onSelectItem,
  onMarginChange,
  onFlightFareSelect,
  passengerCount,
}: QuoteItemListProps & { items: QuoteItem[] }) {
  const { locale } = useDashboardLanguage();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const flightItems = items.filter(
    (item) => item.type === "flight" && item.flightDetails,
  );

  if (flightItems.length === 0) {
    return null;
  }

  const columnLabels =
    locale === "es"
      ? {
          airline: "Aerolínea",
          route: "Ruta",
          duration: "Duración",
          price: "Precio",
          action: "",
        }
      : {
          airline: "Airline",
          route: "Route",
          duration: "Duration",
          price: "Price",
          action: "",
        };

  return (
    <div className="overflow-hidden rounded-xl border border-tquot-border bg-tquot-surface shadow-sm">
      <div className="max-h-[60vh] overflow-y-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-tquot-border bg-tquot-bg text-xs font-semibold uppercase tracking-wide text-tquot-muted">
            <tr>
              <th className="px-3 py-2 sm:px-4">{columnLabels.airline}</th>
              <th className="px-3 py-2 sm:px-4">{columnLabels.route}</th>
              <th className="px-3 py-2 sm:px-4">{columnLabels.duration}</th>
              <th className="px-3 py-2 sm:px-4">{columnLabels.price}</th>
              <th className="px-3 py-2 sm:px-4" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {flightItems.map((item) => (
              <FlightTableRow
                key={item.id}
                item={item}
                passengerCount={passengerCount}
                isExpanded={expandedId === item.id}
                onToggleExpand={() =>
                  setExpandedId((current) =>
                    current === item.id ? null : item.id,
                  )
                }
                onSelect={onSelectItem}
                onMarginChange={onMarginChange}
                onFlightFareSelect={onFlightFareSelect}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
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

  if (item.type === "hotel") {
    return (
      <HotelQuoteItemCard
        item={item}
        onSelect={onSelect}
        onToggle={onToggle}
        onMarginChange={onMarginChange}
        onCompare={onCompare}
        selectionMode={selectionMode}
      />
    );
  }
  const selectionGroup = getQuoteSelectionGroup(item.id);
  const isIndependent = selectionMode === "independent";
  const isSelectable =
    isIndependent ? Boolean(onToggle) : selectionGroup !== null && Boolean(onSelect);
  const isIncluded = !item.alternative;
  const isSelected = isSelectable && isIncluded;
  const marginPercent = getItemMarginPercent(item);

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
  onFlightFareSelect?: (itemId: string, offerId: string) => void;
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
    onFlightFareSelect,
    onCompareItem,
    selectionMode = "exclusive",
    passengerCount,
  } = props;

  const flights = items.filter(
    (item) => item.type === "flight" && item.flightDetails,
  );
  const rest = items.filter(
    (item) => !(item.type === "flight" && item.flightDetails),
  );

  return (
    <>
      {flights.length > 0 ? (
        <FlightDirectionTable
          items={flights}
          onSelectItem={onSelectItem}
          onMarginChange={onMarginChange}
          onFlightFareSelect={onFlightFareSelect}
          passengerCount={passengerCount}
        />
      ) : null}
      {rest.map((item) => (
        <QuoteItemCard
          key={item.id}
          item={item}
          onSelect={onSelectItem}
          onToggle={onToggleItem}
          onMarginChange={onMarginChange}
          onCompare={onCompareItem}
          selectionMode={selectionMode}
        />
      ))}
    </>
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
      <FlightDirectionTable items={items} {...cardProps} />
    </div>
  );
}

export function FlightQuoteItemsSection({
  eyebrow,
  title,
  items,
  onSelectItem,
  onMarginChange,
  onFlightFareSelect,
  passengerCount,
}: {
  eyebrow: string;
  title: string;
  items: QuoteItem[];
  onSelectItem?: (itemId: string) => void;
  onMarginChange?: (itemId: string, marginPercent: number) => void;
  onFlightFareSelect?: (itemId: string, offerId: string) => void;
  passengerCount?: number;
}) {
  const { locale, t } = useDashboardLanguage();
  const { outbound, returnFlights, other } = splitFlightsByDirection(items);
  const cardProps = {
    onSelectItem,
    onMarginChange,
    onFlightFareSelect,
    passengerCount,
  };
  const subtitle = buildSectionSubtitle(items, "exclusive", locale, t);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
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
          <FlightDirectionTable items={other} {...cardProps} />
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
    <section className="flex min-h-0 flex-1 flex-col">
      <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
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

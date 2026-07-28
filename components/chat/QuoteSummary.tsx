"use client";

import { ChevronRight } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Quote } from "@/lib/quote-engine/types";
import { quoteItemToFlight, quoteItemToHotel } from "@/lib/booking-handoff/item-adapters";
import { itemsForPricing } from "@/lib/quotes/build-quote";

interface Props {
  quote: Quote;
  onScrollToCanvas?: () => void;
}

export function QuoteSummary({ quote, onScrollToCanvas }: Props) {
  const total = Math.round(quote.pricing.finalTotal);
  const currency = quote.pricing.currency;
  const hotels = itemsForPricing(quote.hotels)
    .map((item) => quoteItemToHotel(item))
    .filter((h): h is NonNullable<typeof h> => h !== null);
  const flights = itemsForPricing(quote.flights)
    .map((item) => quoteItemToFlight(item))
    .filter((f): f is NonNullable<typeof f> => f !== null);
  const experiences = itemsForPricing(quote.experiences);
  const transfers = itemsForPricing(quote.transfers);

  const destination =
    hotels[0]?.destination ??
    flights[0]?.destination ??
    quote.summary.route.split("→").pop()?.trim() ??
    "—";
  const hotelName = hotels[0]?.name;

  return (
    <div className="my-4 animate-slide-up-fade rounded-lg border border-border-2 bg-paper p-5">
      <Eyebrow className="mb-3 block">Resumen · {destination}</Eyebrow>

      <div className="mb-5 space-y-2">
        {flights.length > 0 ? (
          <SummaryLine
            label="Vuelos"
            value={`${flights.length} segmentos`}
            mono
          />
        ) : null}
        {hotelName ? (
          <SummaryLine label="Hotel" value={hotelName} serif />
        ) : null}
        {experiences.length > 0 ? (
          <SummaryLine
            label="Experiencias"
            value={`${experiences.length} ${
              experiences.length === 1 ? "incluida" : "incluidas"
            }`}
          />
        ) : null}
        {transfers.length > 0 ? (
          <SummaryLine
            label="Traslados"
            value={`${transfers.length} confirmados`}
          />
        ) : null}
      </div>

      <div className="flex items-end justify-between border-t border-border-1 pt-4">
        <div>
          <Eyebrow>Total estimado</Eyebrow>
          <div className="mt-1 font-mono text-display-2 leading-none text-ink tabular-nums">
            {total.toLocaleString("es-ES")}
            <span className="ml-1 text-h2 text-text-2">{currency}</span>
          </div>
          <div className="mt-3 h-0.5 w-12 bg-umber" />
        </div>
        {onScrollToCanvas ? (
          <Button variant="primary" onClick={onScrollToCanvas}>
            Ver detalles
            <ChevronRight size={14} strokeWidth={1.5} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  mono,
  serif,
}: {
  label: string;
  value: string;
  mono?: boolean;
  serif?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-body-sm">
      <span className="text-text-2">{label}</span>
      <span
        className={cn(
          "truncate text-right text-ink",
          mono && "font-mono",
          serif && "font-serif text-[15px]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

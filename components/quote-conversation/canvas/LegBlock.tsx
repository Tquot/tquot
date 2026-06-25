"use client";

import type { ReactNode } from "react";
import type { SectionStatus } from "@/lib/quote-conversation/types";
import { useQuoteConversationStore, selectCurrentQuote } from "@/lib/quote-conversation/store";
import type { TripLeg } from "@/lib/quote-engine/schemas-v2";
import type { QuoteItem } from "@/lib/quotes/build-quote";

interface Props {
  leg: TripLeg;
  legIndex: number;
  totalLegs: number;
}

type ItemWithLeg = QuoteItem & { legId?: string };

function itemsForLeg(items: QuoteItem[] | undefined, leg: TripLeg, legIndex: number): QuoteItem[] {
  const list = items ?? [];
  const tagged = list.filter((item) => {
    const legId = (item as ItemWithLeg).legId;
    if (legId) return legId === leg.id;
    return legIndex === 0;
  });
  return tagged;
}

function CanvasSection({
  title,
  status,
  children,
}: {
  title: string;
  status?: SectionStatus;
  children: ReactNode;
}) {
  const statusLabel =
    status?.kind === "searching"
      ? "Buscando…"
      : status?.kind === "error"
        ? "Error"
        : status?.kind === "done"
          ? "Listo"
          : null;

  return (
    <section className="rounded-lg border border-neutral-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        {statusLabel ? (
          <span className="text-xs text-neutral-500">{statusLabel}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function LegBlock({ leg, legIndex, totalLegs }: Props) {
  const quote = useQuoteConversationStore(selectCurrentQuote);
  const buildProgress = useQuoteConversationStore((s) =>
    s.state.status === "building" ? s.state.progress : null,
  );

  const flights = itemsForLeg(quote?.flights, leg, legIndex);
  const hotels = itemsForLeg(quote?.hotels, leg, legIndex);
  const experiences = itemsForLeg(quote?.experiences, leg, legIndex);
  const transfers = itemsForLeg(quote?.transfers, leg, legIndex);

  const progress = buildProgress?.[leg.id] ?? null;

  return (
    <section className="space-y-4">
      {totalLegs > 1 && (
        <header className="border-b border-neutral-200 pb-2 mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Tramo {legIndex + 1} de {totalLegs}
            </span>
            <h2 className="text-base font-semibold">
              {leg.origin ?? "?"} → {leg.destination}
            </h2>
          </div>
          <p className="text-xs text-neutral-600 mt-0.5">
            {formatDate(leg.arrivalDate)} a {formatDate(leg.departureDate)}
          </p>
        </header>
      )}

      <FlightsForLeg flights={flights} status={progress?.flights} />
      <HotelsForLeg hotels={hotels} status={progress?.hotels} />
      <ExperiencesForLeg experiences={experiences} status={progress?.experiences} />
      <TransfersForLeg transfers={transfers} status={progress?.transfers} />
    </section>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function FlightsForLeg({
  flights,
  status,
}: {
  flights: QuoteItem[];
  status?: SectionStatus;
}) {
  if (flights.length === 0 && status?.kind !== "searching" && status?.kind !== "pending") {
    return null;
  }
  return (
    <CanvasSection title="Vuelos" status={status}>
      {flights.length === 0 ? (
        <p className="text-sm text-neutral-500">Sin resultados todavía.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {flights.map((flight) => (
            <li key={flight.id}>
              {flight.title} — {flight.price} €
            </li>
          ))}
        </ul>
      )}
    </CanvasSection>
  );
}

function HotelsForLeg({
  hotels,
  status,
}: {
  hotels: QuoteItem[];
  status?: SectionStatus;
}) {
  if (hotels.length === 0 && status?.kind !== "searching" && status?.kind !== "pending") {
    return null;
  }
  return (
    <CanvasSection title="Hoteles" status={status}>
      {hotels.length === 0 ? (
        <p className="text-sm text-neutral-500">Sin resultados todavía.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {hotels.map((hotel) => (
            <li key={hotel.id}>
              {hotel.title} — {hotel.price} €
            </li>
          ))}
        </ul>
      )}
    </CanvasSection>
  );
}

function ExperiencesForLeg({
  experiences,
  status,
}: {
  experiences: QuoteItem[];
  status?: SectionStatus;
}) {
  if (
    experiences.length === 0 &&
    status?.kind !== "searching" &&
    status?.kind !== "pending"
  ) {
    return null;
  }
  return (
    <CanvasSection title="Experiencias" status={status}>
      {experiences.length === 0 ? (
        <p className="text-sm text-neutral-500">Sin resultados todavía.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {experiences.map((item) => (
            <li key={item.id}>
              {item.title} — {item.price} €
            </li>
          ))}
        </ul>
      )}
    </CanvasSection>
  );
}

function TransfersForLeg({
  transfers,
  status,
}: {
  transfers: QuoteItem[];
  status?: SectionStatus;
}) {
  if (transfers.length === 0 && status?.kind !== "searching" && status?.kind !== "pending") {
    return null;
  }
  return (
    <CanvasSection title="Traslados" status={status}>
      {transfers.length === 0 ? (
        <p className="text-sm text-neutral-500">Sin resultados todavía.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {transfers.map((item) => (
            <li key={item.id}>
              {item.title} — {item.price} €
            </li>
          ))}
        </ul>
      )}
    </CanvasSection>
  );
}

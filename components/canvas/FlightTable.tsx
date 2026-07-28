"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plane } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { BookingHandoffButton } from "@/components/booking-handoff/BookingHandoffButton";
import { cn } from "@/lib/utils";
import type { Flight } from "@/lib/quote-engine/types";
import type { BookingHandoff } from "@/lib/booking-handoff/types";

interface Props {
  flights: Flight[];
  handoffs: Map<string, BookingHandoff>;
  legLabel: string;
  date: string;
}

export function FlightTable({ flights, handoffs, legLabel, date }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    flights[0]?.id ?? null,
  );
  const sortedFlights = [...flights].sort((a, b) => a.price - b.price);

  if (flights.length === 0) return null;

  return (
    <section className="animate-slide-up-fade overflow-hidden rounded-lg border border-border-1 bg-paper">
      <header className="flex items-center justify-between border-b border-border-1 bg-paper-2 px-5 py-3">
        <div className="flex items-center gap-3">
          <Plane size={16} strokeWidth={1.5} className="text-text-2" />
          <Eyebrow tone="ink">{legLabel}</Eyebrow>
          <span className="font-mono text-mono-sm text-text-2">· {date}</span>
        </div>
        <span className="text-body-sm text-text-2">
          {flights.length} opciones
        </span>
      </header>

      <div className="divide-y divide-border-1">
        {sortedFlights.map((flight) => (
          <FlightRow
            key={flight.id}
            flight={flight}
            selected={flight.id === selectedId}
            onSelect={() => setSelectedId(flight.id)}
            handoff={handoffs.get(flight.id) ?? null}
          />
        ))}
      </div>
    </section>
  );
}

interface RowProps {
  flight: Flight;
  selected: boolean;
  onSelect: () => void;
  handoff: BookingHandoff | null;
}

function normalizeTime(value?: string): string {
  if (!value) return "—";
  if (value.includes("T")) return value.slice(11, 16);
  if (/^\d{1,2}:\d{2}/.test(value)) return value.slice(0, 5);
  return value;
}

function FlightRow({ flight, selected, onSelect, handoff }: RowProps) {
  const [open, setOpen] = useState(false);
  const slice0 = flight.slices?.[0];
  const firstSegment = slice0?.segments?.[0];
  const lastSegment = slice0?.segments?.[slice0.segments.length - 1];
  const stops = (slice0?.segments?.length ?? 1) - 1;

  return (
    <div
      className={cn(
        "transition-colors duration-140",
        selected ? "bg-paper-2" : "hover:bg-paper-2",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="grid w-full grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-4 px-5 py-4 text-left"
      >
        <div className="flex min-w-[80px] items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md font-mono text-mono-sm font-semibold",
              selected ? "bg-ink text-paper" : "bg-paper-3 text-ink",
            )}
          >
            {flight.carrier}
          </div>
        </div>

        <div>
          <div className="font-mono text-mono-md text-ink tabular-nums">
            {normalizeTime(firstSegment?.departureTime)}
          </div>
          <div className="text-body-sm text-text-2">
            {firstSegment?.origin?.iata_code ?? flight.origin ?? "—"}
          </div>
        </div>

        <div>
          <div className="font-mono text-mono-md text-ink tabular-nums">
            {normalizeTime(lastSegment?.arrivalTime)}
          </div>
          <div className="text-body-sm text-text-2">
            {lastSegment?.destination?.iata_code ?? flight.destination ?? "—"}
          </div>
        </div>

        <div className="min-w-[100px] text-right">
          <div className="text-body-sm font-medium">
            {stops === 0
              ? "Directo"
              : `${stops} ${stops === 1 ? "escala" : "escalas"}`}
          </div>
          <div className="font-mono text-body-sm text-text-2">
            {flight.duration ?? "—"}
          </div>
        </div>

        <div className="min-w-[100px] text-right">
          <div className="font-mono text-h3 text-ink tabular-nums">
            {Math.round(flight.price)} {flight.currency}
          </div>
          {flight.fareClass ? (
            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-text-2">
              {flight.fareClass}
            </div>
          ) : null}
        </div>
      </button>

      {selected ? (
        <div className="-mt-1 animate-slide-up-fade px-5 pb-4">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-body-sm text-text-2 hover:text-ink"
          >
            {open ? "Ocultar detalles" : "Ver segmentos"}
            {open ? (
              <ChevronUp size={14} strokeWidth={1.5} />
            ) : (
              <ChevronDown size={14} strokeWidth={1.5} />
            )}
          </button>

          {open ? (
            <div className="mt-3 space-y-2 font-mono text-mono-sm">
              {slice0?.segments?.map((seg, i) => (
                <div key={i} className="flex items-center gap-3 text-text-2">
                  <span className="text-ink">
                    {seg.flightNumber ?? `${flight.carrier}—`}
                  </span>
                  <span>
                    {seg.origin.iata_code} {normalizeTime(seg.departureTime)}
                  </span>
                  <span>→</span>
                  <span>
                    {seg.destination.iata_code} {normalizeTime(seg.arrivalTime)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {handoff ? (
            <div className="mt-4 flex justify-end">
              <BookingHandoffButton handoff={handoff} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

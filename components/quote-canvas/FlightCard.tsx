"use client";

/**
 * FlightCard legacy → usa FlightTable de una sola fila cuando se importa
 * individualmente. Preferir `FlightTable` en layouts nuevos.
 */
import { FlightTable } from "@/components/canvas/FlightTable";
import type { BookingHandoff } from "@/lib/booking-handoff/types";
import type { Flight } from "@/lib/quote-engine/types";

interface Props {
  flight: Flight;
  handoff: BookingHandoff | null;
}

export function FlightCard({ flight, handoff }: Props) {
  const handoffs = new Map<string, BookingHandoff>();
  if (handoff) handoffs.set(flight.id, handoff);

  const legLabel =
    flight.origin && flight.destination
      ? `${flight.origin} → ${flight.destination}`
      : flight.carrierName ?? flight.carrier;

  const date = flight.slices?.[0]?.departureDate ?? "";

  return (
    <FlightTable
      flights={[flight]}
      handoffs={handoffs}
      legLabel={legLabel}
      date={date}
    />
  );
}

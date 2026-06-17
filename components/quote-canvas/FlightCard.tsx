import { BookingHandoffButton } from "@/components/booking-handoff/BookingHandoffButton";
import type { BookingHandoff } from "@/lib/booking-handoff/types";
import type { Flight } from "@/lib/quote-engine/types";

interface Props {
  flight: Flight;
  handoff: BookingHandoff | null;
}

export function FlightCard({ flight, handoff }: Props) {
  const route =
    flight.origin && flight.destination
      ? `${flight.origin} → ${flight.destination}`
      : null;

  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4">
      <h4 className="font-semibold text-neutral-900">
        {flight.carrierName ?? flight.carrier}
      </h4>
      {route ? <p className="mt-1 text-sm text-neutral-600">{route}</p> : null}

      <footer className="mt-3 flex items-center justify-between">
        <div className="text-sm font-semibold">
          {flight.price} {flight.currency}
        </div>
        {handoff && <BookingHandoffButton handoff={handoff} />}
      </footer>
    </article>
  );
}

import { BookingHandoffButton } from "@/components/booking-handoff/BookingHandoffButton";
import { MoneyDisplay } from "@/components/currency/MoneyDisplay";
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
          <MoneyDisplay
            amount={flight.price}
            currency={flight.currency}
            originalAmount={flight.originalPrice}
            originalCurrency={flight.originalCurrency}
            exchangeRate={flight.exchangeRate}
            rateAt={flight.rateAt}
          />
        </div>
        {handoff && <BookingHandoffButton handoff={handoff} />}
      </footer>
    </article>
  );
}

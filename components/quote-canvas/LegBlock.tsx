"use client";

import { FlightCard } from "@/components/quote-canvas/FlightCard";
import { HotelCard } from "@/components/quote-canvas/HotelCard";
import { useBookingConfig } from "@/lib/booking-handoff/context";
import {
  handoffProviderForHotel,
  quoteItemToFlight,
  quoteItemToHotel,
} from "@/lib/booking-handoff/item-adapters";
import { getHandoff } from "@/lib/booking-handoff/registry";
import type { AgencyBookingConfig } from "@/lib/booking-handoff/types";
import {
  selectCurrentQuote,
  selectParsedTripInput,
  useQuoteConversationStore,
} from "@/lib/quote-conversation/store";
import type { TripLeg } from "@/lib/quote-engine/schemas-v2";
import { toParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import type { Quote } from "@/lib/quotes/build-quote";

interface Props {
  leg: TripLeg;
  legIndex: number;
  totalLegs: number;
  agencyConfig: AgencyBookingConfig;
}

export function LegBlock({ leg, legIndex, totalLegs, agencyConfig }: Props) {
  const quote = useQuoteConversationStore(selectCurrentQuote);
  const parsedInput = useQuoteConversationStore(selectParsedTripInput);

  if (!quote || !parsedInput) return null;

  const parsed = toParsedTripInputV2(parsedInput);
  const handoffQuote = quote as Quote & { group?: { distribution: { doubles: number; singles: number; triples: number; totalRooms: number } } };
  const context = { agencyConfig, quote: handoffQuote, parsed };

  const selectedItems = (items: Quote["hotels"]) =>
    (items ?? []).filter((item) => !item.alternative);

  const hotels = selectedItems(quote.hotels)
    .map((item) => quoteItemToHotel(item, leg.id))
    .filter((hotel): hotel is NonNullable<typeof hotel> => hotel !== null);

  const flights = selectedItems(quote.flights)
    .map((item) => quoteItemToFlight(item, leg.id))
    .filter((flight): flight is NonNullable<typeof flight> => flight !== null);

  if (hotels.length === 0 && flights.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <header className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Tramo {legIndex + 1} de {totalLegs}
        </p>
        <p className="text-sm text-neutral-700">
          {leg.arrivalDate} → {leg.departureDate}
        </p>
      </header>

      {hotels.map((hotel) => {
        const sourceItem = selectedItems(quote.hotels).find((item) => item.id === hotel.id);
        const provider = sourceItem ? handoffProviderForHotel(sourceItem) : hotel.provider;
        const handoff = provider
          ? getHandoff(provider, hotel, context)
          : null;

        return <HotelCard key={hotel.id} hotel={hotel} handoff={handoff} />;
      })}

      {flights.map((flight) => {
        const handoff = getHandoff("duffel", flight, context);
        return <FlightCard key={flight.id} flight={flight} handoff={handoff} />;
      })}
    </section>
  );
}

export function BookingHandoffLegSection() {
  const agencyConfig = useBookingConfig();
  const parsedInput = useQuoteConversationStore(selectParsedTripInput);
  const quote = useQuoteConversationStore(selectCurrentQuote);

  if (!parsedInput || !quote) return null;

  const parsed = toParsedTripInputV2(parsedInput);
  if (parsed.legs.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">Reserva externa</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Abre el extranet del proveedor o copia los datos necesarios para reservar fuera de TQuot.
        </p>
      </div>
      {parsed.legs.map((leg, index) => (
        <LegBlock
          key={leg.id}
          leg={leg}
          legIndex={index}
          totalLegs={parsed.legs.length}
          agencyConfig={agencyConfig}
        />
      ))}
    </div>
  );
}

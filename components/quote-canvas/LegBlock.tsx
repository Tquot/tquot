"use client";

import { useAccessibilityProfile } from "@/components/accessibility/AccessibilityProfileContext";
import { matchesHotel } from "@/lib/accessibility/match";
import { FlightTable } from "@/components/canvas/FlightTable";
import { HotelCard } from "@/components/canvas/HotelCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useBookingConfig } from "@/lib/booking-handoff/context";
import {
  handoffProviderForHotel,
  quoteItemToFlight,
  quoteItemToHotel,
} from "@/lib/booking-handoff/item-adapters";
import { getHandoff } from "@/lib/booking-handoff/registry";
import type { AgencyBookingConfig } from "@/lib/booking-handoff/types";
import type { BookingHandoff } from "@/lib/booking-handoff/types";
import {
  selectCurrentQuote,
  selectParsedTripInput,
  useQuoteConversationStore,
} from "@/lib/quote-conversation/store";
import type { TripLeg } from "@/lib/quote-engine/schemas-v2";
import { toParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import {
  applyItemMargin,
  getItemMarginPercent,
  syncQuotePricing,
  type Quote,
  type QuoteItem,
} from "@/lib/quotes/build-quote";
import { cloneQuote } from "@/app/dashboard/new-quote/quote-shared";
import { persistQuoteSnapshotMutation } from "@/lib/versioning/persist-mutation";

interface Props {
  leg: TripLeg;
  legIndex: number;
  totalLegs: number;
  agencyConfig?: AgencyBookingConfig;
}

function nightsLabel(arrival: string, departure: string): string {
  const start = new Date(`${arrival}T12:00:00`).getTime();
  const end = new Date(`${departure}T12:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return "";
  }
  const nights = Math.round((end - start) / (24 * 60 * 60 * 1000));
  return `${nights} ${nights === 1 ? "noche" : "noches"}`;
}

function formatLegDates(arrival: string, departure: string): string {
  try {
    const start = new Date(`${arrival}T12:00:00`).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
    const end = new Date(`${departure}T12:00:00`).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
    return `${start}–${end}`;
  } catch {
    return `${arrival} → ${departure}`;
  }
}

export function LegBlock({
  leg,
  legIndex,
  totalLegs,
  agencyConfig: agencyConfigProp,
}: Props) {
  const bookingConfig = useBookingConfig();
  const agencyConfig = agencyConfigProp ?? bookingConfig;
  const quote = useQuoteConversationStore(selectCurrentQuote);
  const parsedInput = useQuoteConversationStore(selectParsedTripInput);
  const updateQuote = useQuoteConversationStore((s) => s.updateQuote);
  const persistedQuoteId = useQuoteConversationStore((s) => s.persistedQuoteId);
  const { profile: accessibilityProfile } = useAccessibilityProfile();

  if (!quote || !parsedInput) return null;

  const parsed = toParsedTripInputV2(parsedInput);
  const profile =
    accessibilityProfile ??
    parsedInput.preferences.accessibilityProfile ??
    parsed.preferences.accessibilityProfile;
  const handoffQuote = quote as Quote & {
    group?: {
      distribution: {
        doubles: number;
        singles: number;
        triples: number;
        totalRooms: number;
      };
    };
  };
  const context = { agencyConfig, quote: handoffQuote, parsed };

  const selectedItems = (items: QuoteItem[] | undefined) =>
    (items ?? []).filter((item: QuoteItem) => !item.alternative);

  const hotels = selectedItems(quote.hotels)
    .map((item) => quoteItemToHotel(item, leg.id))
    .filter((hotel): hotel is NonNullable<typeof hotel> => hotel !== null)
    .sort((a, b) => {
      const scoreA = matchesHotel(profile, a.accessibility).score;
      const scoreB = matchesHotel(profile, b.accessibility).score;
      return scoreB - scoreA;
    });

  const flights = selectedItems(quote.flights)
    .map((item) => quoteItemToFlight(item, leg.id))
    .filter((flight): flight is NonNullable<typeof flight> => flight !== null);

  if (hotels.length === 0 && flights.length === 0) {
    return null;
  }

  const routeLabel =
    (leg.origin || flights[0]?.origin || "") &&
    (leg.destination || flights[0]?.destination || "")
      ? `${leg.origin ?? flights[0]?.origin} → ${leg.destination ?? flights[0]?.destination}`
      : leg.destination;

  const nights = nightsLabel(leg.arrivalDate, leg.departureDate);
  const flightHandoffs = new Map<string, BookingHandoff>();
  for (const flight of flights) {
    const handoff = getHandoff("duffel", flight, context);
    if (handoff) flightHandoffs.set(flight.id, handoff);
  }

  return (
    <section className="space-y-4">
      <header className="border-b border-border-1 pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow>
            ← Tramo {legIndex + 1}
            {totalLegs > 1 ? ` de ${totalLegs}` : ""}
          </Eyebrow>
          <span className="font-mono text-mono-sm text-ink">{routeLabel}</span>
        </div>
        <p className="mt-1 text-body-sm text-text-2">
          {[leg.destination, nights, formatLegDates(leg.arrivalDate, leg.departureDate)]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      {hotels.map((hotel, index) => {
        const sourceItem = selectedItems(quote.hotels).find(
          (item) => item.id === hotel.id,
        );
        const provider = sourceItem
          ? handoffProviderForHotel(sourceItem)
          : hotel.provider;
        const handoff = provider
          ? getHandoff(provider, hotel, context)
          : null;

        return (
          <HotelCard
            key={hotel.id}
            hotel={hotel}
            quoteId={persistedQuoteId ?? undefined}
            handoff={handoff}
            index={index}
            accessibilityProfile={profile}
            onBoardUpdated={(update) => {
              const next = cloneQuote(quote as Quote);
              const item = next.hotels.find(
                (entry) => entry.id === update.hotelId,
              );
              if (!item) return;
              item.price = update.totalPrice;
              item.hotelDetails = {
                ...item.hotelDetails,
                boardCode: update.boardCode,
                netPrice: update.totalPrice,
                rateKey: update.rateKey ?? item.hotelDetails?.rateKey,
                currency: update.currency,
                fetchedAt: update.fetchedAt,
              };
              applyItemMargin(item, getItemMarginPercent(item));
              syncQuotePricing(next);
              updateQuote(next);
              if (persistedQuoteId) {
                void persistQuoteSnapshotMutation({
                  quoteId: persistedQuoteId,
                  newSnapshot: next,
                  changeKind: "board_change",
                  changeSummary: `Cambio de régimen a ${update.boardCode}: ${item.title}`,
                }).catch((error) =>
                  console.error(
                    "[LegBlock] version board_change failed",
                    error,
                  ),
                );
              }
            }}
          />
        );
      })}

      {flights.length > 0 ? (
        <FlightTable
          flights={flights}
          handoffs={flightHandoffs}
          legLabel={routeLabel}
          date={leg.arrivalDate}
        />
      ) : null}
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
    <div className="space-y-6">
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

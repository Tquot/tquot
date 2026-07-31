import type { CloseFacts } from "@/lib/agent/types";
import type { SuggestionContext } from "@/lib/agent/suggestions/types";
import {
  matchCandidateFlight,
  matchCandidateHotel,
  primaryFlight,
  primaryHotel,
} from "@/lib/agent/suggestions/helpers";
import { hotelNights } from "@/lib/agent/suggestions/helpers";

const SECONDARY_AIRPORTS: Record<
  string,
  { name: string; minutesToCenter: number }
> = {
  CIA: { name: "Ciampino", minutesToCenter: 45 },
  BGY: { name: "Bérgamo", minutesToCenter: 60 },
  HHN: { name: "Hahn", minutesToCenter: 105 },
  NRN: { name: "Weeze", minutesToCenter: 90 },
  CRL: { name: "Charleroi", minutesToCenter: 60 },
  STN: { name: "Stansted", minutesToCenter: 50 },
  LTN: { name: "Luton", minutesToCenter: 45 },
  TRF: { name: "Sandefjord", minutesToCenter: 110 },
  SXF: { name: "Schönefeld", minutesToCenter: 45 },
  GRO: { name: "Girona", minutesToCenter: 75 },
  REU: { name: "Reus", minutesToCenter: 90 },
};

function sameArea(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "");
  return norm(a).includes(norm(b)) || norm(b).includes(norm(a));
}

/** Detectores deterministas de "cosas que un experto mencionaría". */
export function extractCloseFacts(ctx: SuggestionContext): CloseFacts {
  const notes: string[] = [];
  const flightItem = primaryFlight(ctx.quote);
  const hotelItem = primaryHotel(ctx.quote);
  const flight = matchCandidateFlight(flightItem, ctx.candidates.flights);
  const hotel = matchCandidateHotel(hotelItem, ctx.candidates.hotels);

  if (flight) {
    const segs = flight.slices?.[0]?.segments;
    const arrival = segs?.[segs.length - 1]?.destination?.iata_code;
    const secondary = arrival ? SECONDARY_AIRPORTS[arrival] : undefined;
    if (arrival && secondary) {
      notes.push(
        `${arrival} (${secondary.name}) está a ${secondary.minutesToCenter} min del centro`,
      );
    }
  } else if (flightItem?.flightDetails?.destinationIata) {
    const arrival = flightItem.flightDetails.destinationIata;
    const secondary = SECONDARY_AIRPORTS[arrival];
    if (secondary) {
      notes.push(
        `${arrival} (${secondary.name}) está a ${secondary.minutesToCenter} min del centro`,
      );
    }
  }

  const requestedArea =
    ctx.parsed.legs[0]?.legPreferences?.locationLandmarks?.[0] ??
    ctx.parsed.preferences.locationLandmarks?.[0];
  if (hotel && requestedArea && hotel.address) {
    if (!sameArea(hotel.address, requestedArea) && !sameArea(hotel.destination ?? "", requestedArea)) {
      // Solo si el address menciona otra zona conocida — skip noisy notes
    }
  }

  if (hotel && hotel.refundable === false) {
    notes.push(`el ${hotel.name} no es reembolsable`);
  }

  const hotels = ctx.candidates.hotels
    .filter((h) => !hotel || h.legId === hotel.legId)
    .sort((a, b) => a.netPrice - b.netPrice);
  if (hotels.length >= 2 && hotel) {
    const idx = hotels.findIndex((h) => h.id === hotel.id);
    const next = hotels[idx + 1];
    const nights = hotelNights(hotel, ctx.parsed.legs[0]);
    if (next && (next.netPrice - hotel.netPrice) / hotel.netPrice < 0.06) {
      notes.push(
        `el ${next.name} sale solo ${Math.round((next.netPrice - hotel.netPrice) * nights)} € más en total`,
      );
    }
  }

  const pax =
    ctx.parsed.travelers.adults + ctx.parsed.travelers.children.length;

  const hotelName =
    hotel?.name ??
    hotelItem?.title?.split(" · ")[0];
  const hotelNet =
    hotel?.netPrice ??
    hotelItem?.hotelDetails?.netPrice ??
    (hotelItem && hotelItem.price
      ? Math.round(hotelItem.price / Math.max(1, hotelNights(hotel ?? hotelItem, ctx.parsed.legs[0])))
      : undefined);

  return {
    totalPrice: ctx.quote.pricing.finalTotal,
    currency: ctx.quote.pricing.currency ?? "EUR",
    pax,
    topHotel:
      hotelName && hotelNet != null
        ? { name: hotelName, netPrice: Math.round(hotelNet) }
        : undefined,
    topFlight: flight
      ? {
          carrier: flight.carrierName ?? flight.carrier,
          price: Math.round(flight.price),
        }
      : flightItem
        ? {
            carrier:
              flightItem.flightDetails?.airline ?? flightItem.provider,
            price: Math.round(flightItem.price),
          }
        : undefined,
    notes: notes.slice(0, 3),
  };
}

export { SECONDARY_AIRPORTS };

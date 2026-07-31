import type { Flight, Hotel } from "@/lib/quote-engine/types";
import type { Quote, QuoteItem } from "@/lib/quotes/build-quote";
import type { TripLeg } from "@/lib/quote-engine/schemas-v2";
import { legNights } from "@/lib/agent/format";

const EU_COUNTRY_HINTS = [
  "españa",
  "spain",
  "portugal",
  "francia",
  "france",
  "italia",
  "italy",
  "roma",
  "rome",
  "alemania",
  "germany",
  "holanda",
  "nederland",
  "bélgica",
  "belgium",
  "austria",
  "grecia",
  "greece",
  "irlanda",
  "ireland",
  "suecia",
  "sweden",
  "dinamarca",
  "denmark",
  "finlandia",
  "finland",
  "polonia",
  "poland",
  "chequia",
  "praga",
  "lisboa",
  "lisbon",
  "madrid",
  "barcelona",
  "parís",
  "paris",
  "milán",
  "milan",
  "florencia",
  "venecia",
  "amsterdam",
  "berlín",
  "berlin",
  "viena",
  "vienna",
  "atenas",
  "athens",
];

export function primaryItems(items: QuoteItem[]): QuoteItem[] {
  const primaries = items.filter((i) => !i.alternative);
  return primaries.length > 0 ? primaries : items.slice(0, 1);
}

export function primaryFlight(quote: Quote): QuoteItem | undefined {
  return primaryItems(quote.flights)[0];
}

export function primaryHotel(quote: Quote): QuoteItem | undefined {
  return primaryItems(quote.hotels)[0];
}

export function countStops(flight: Flight | QuoteItem): number {
  if ("flightDetails" in flight && flight.flightDetails) {
    return flight.flightDetails.stops ?? flight.flightDetails.layovers?.length ?? 0;
  }
  const slices = (flight as Flight).slices;
  if (!slices?.length) return 0;
  return Math.max(0, (slices[0]?.segments?.length ?? 1) - 1);
}

export function maxLayoverHours(flight: Flight | QuoteItem): number {
  if ("flightDetails" in flight && flight.flightDetails?.layovers?.length) {
    let maxH = 0;
    for (const lay of flight.flightDetails.layovers) {
      const m = lay.duration.match(/(\d+)\s*h/);
      const hours = m ? parseInt(m[1]!, 10) : 0;
      if (hours > maxH) maxH = hours;
    }
    return maxH;
  }
  return 0;
}

export function isEuDestination(destination: string): boolean {
  const d = destination.toLowerCase();
  return EU_COUNTRY_HINTS.some((h) => d.includes(h));
}

/** Tabla conservadora cuando Battleface no está conectado. */
export function estimateInsurance(input: {
  pax: number;
  nights: number;
  nonEu: boolean;
}): number {
  const basePerPax = input.nonEu ? 28 : 18;
  const nightFactor = Math.max(1, Math.ceil(input.nights / 7));
  return Math.round(input.pax * basePerPax * nightFactor);
}

export function hasInsurance(quote: Quote): boolean {
  return quote.experiences.some(
    (e) =>
      /seguro|insurance|battleface/i.test(e.title) ||
      e.id.startsWith("exp-insurance"),
  );
}

export function hotelNights(hotel: Hotel | QuoteItem, fallbackLeg?: TripLeg): number {
  if ("nights" in hotel && typeof hotel.nights === "number" && hotel.nights > 0) {
    return hotel.nights;
  }
  if (fallbackLeg) {
    return legNights(fallbackLeg.arrivalDate, fallbackLeg.departureDate);
  }
  return 4;
}

export function matchCandidateHotel(
  item: QuoteItem | undefined,
  hotels: Hotel[],
): Hotel | undefined {
  if (!item) return hotels[0];
  return hotels.find((h) => h.id === item.id) ?? hotels[0];
}

export function matchCandidateFlight(
  item: QuoteItem | undefined,
  flights: Flight[],
): Flight | undefined {
  if (!item) return flights[0];
  return flights.find((f) => f.id === item.id) ?? flights[0];
}

/**
 * Sin birthDate en el schema: avisamos si el menor está a un año de un umbral típico.
 */
export function childNearAgeThreshold(
  age: number,
  thresholds: number[] = [2, 12, 13, 18],
): boolean {
  return thresholds.includes(age + 1);
}

export function boardOrderCode(code: string): string {
  const map: Record<string, string> = {
    RO: "SA",
    SA: "SA",
    BB: "AD",
    AD: "AD",
    HB: "MP",
    MP: "MP",
    FB: "PC",
    PC: "PC",
    AI: "TI",
    TI: "TI",
  };
  return map[code.toUpperCase()] ?? code.toUpperCase();
}

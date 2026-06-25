import type { BuildEvent, QuoteSection, RecommendationEvent } from "@/lib/quote-conversation/types";
import type { ParsedTripInputV2, TripLeg } from "@/lib/quote-engine/schemas-v2";
import type { Flight, Hotel, Experience, Transfer } from "@/lib/quote-engine/types";
import { getEntry, type ServiceCategory } from "@/lib/recommendations/catalog";

const SECTION_LABEL: Record<QuoteSection, string> = {
  flights: "vuelos",
  hotels: "hoteles",
  experiences: "experiencias",
  transfers: "traslados",
};

export function narrateBuildEvent(
  event: BuildEvent,
  parsed: ParsedTripInputV2,
): string | null {
  const leg =
    "legId" in event && event.legId
      ? (parsed.legs.find((l) => l.id === event.legId) ?? null)
      : null;

  switch (event.type) {
    case "section.started":
      return narrateSectionStarted(event.section, leg, parsed);

    case "section.done":
      switch (event.section) {
        case "flights":
          return narrateFlightsDone(event.results as Flight[], leg);
        case "hotels":
          return narrateHotelsDone(event.results as Hotel[], leg);
        case "experiences":
          return narrateExperiencesDone(event.results as Experience[], leg);
        case "transfers":
          return narrateTransfersDone(event.results as Transfer[], leg);
      }
      return null;

    case "section.error":
      return narrateSectionError(event.section, event.error, event.skipped, leg);

    default:
      return null;
  }
}

export function narrateRecommendationEvent(
  event: RecommendationEvent,
): string | null {
  switch (event.type) {
    case "recommendation.done": {
      const entry = getEntry(event.category as ServiceCategory);
      const source = event.source === "cache" ? " (de caché)" : "";
      return `Añadí ${event.providers.length} sugerencias de ${entry.label.toLowerCase()}${source}.`;
    }
    case "recommendation.error": {
      const entry = getEntry(event.category as ServiceCategory);
      return `No pude buscar proveedores de ${entry.label.toLowerCase()}: ${shortError(event.error)}.`;
    }
    case "recommendation.started":
      return null;
  }
}

function narrateSectionStarted(
  section: QuoteSection,
  leg: TripLeg | null,
  parsed: ParsedTripInputV2,
): string {
  const dest = leg?.destination ?? parsed.legs[0]?.destination ?? "el destino";
  const legSuffix = parsed.legs.length > 1 && leg ? ` (leg ${leg.order + 1})` : "";

  switch (section) {
    case "flights": {
      const origin = leg?.origin;
      return origin
        ? `Buscando vuelos ${origin} → ${dest}${legSuffix}…`
        : `Buscando vuelos a ${dest}${legSuffix}…`;
    }
    case "hotels":
      return `Mirando hoteles en ${dest}${legSuffix} para ${formatStay(leg)}…`;
    case "experiences":
      return `Mirando experiencias en ${dest}${legSuffix}…`;
    case "transfers":
      return `Comprobando traslados en ${dest}${legSuffix}…`;
  }
}

function narrateFlightsDone(flights: Flight[], leg: TripLeg | null): string | null {
  if (flights.length === 0) {
    return `No encontré vuelos para ${leg?.destination ?? "este tramo"}. Mira si las fechas se pueden mover.`;
  }

  const cheapest = flights.reduce((min, f) => (f.price < min.price ? f : min), flights[0]);
  const carriers = Array.from(new Set(flights.map((f) => f.carrier).filter(Boolean)));
  const route = leg?.origin && leg ? `${leg.origin} → ${leg.destination}` : (leg?.destination ?? "");

  if (flights.length === 1) {
    return `1 vuelo ${route}: ${cheapest.carrier} a ${formatPrice(cheapest.price, cheapest.currency)}.`;
  }

  const carrierList = carriers.slice(0, 3).join(", ");
  const more = carriers.length > 3 ? " y más" : "";
  return `${flights.length} opciones ${route} desde ${formatPrice(cheapest.price, cheapest.currency)} con ${carrierList}${more}.`;
}

function narrateHotelsDone(hotels: Hotel[], leg: TripLeg | null): string | null {
  if (hotels.length === 0) {
    return `Sin hoteles en ${leg?.destination ?? "este destino"} con esos parámetros. Voy a relajar criterios.`;
  }

  const own = hotels.filter((h) => h.provider === "own");
  const hotelbeds = hotels.filter((h) => h.provider === "hotelbeds");
  const booking = hotels.filter((h) => h.provider === "booking");

  const parts: string[] = [];
  if (own.length > 0) parts.push(`${own.length} de tu inventario`);
  if (hotelbeds.length > 0) parts.push(`${hotelbeds.length} en Hotelbeds`);
  if (booking.length > 0) parts.push(`${booking.length} en Booking`);

  const cheapest = hotels.reduce((min, h) => (h.netPrice < min.netPrice ? h : min), hotels[0]);
  const summary = parts.join(", ").replace(/,([^,]*)$/, " y$1");
  const destSuffix = leg ? ` en ${leg.destination}` : "";

  return `${summary} ${destSuffix}. Desde ${formatPrice(cheapest.netPrice, cheapest.currency)}/noche.`;
}

function narrateExperiencesDone(items: Experience[], leg: TripLeg | null): string | null {
  if (items.length === 0) return null;
  const destSuffix = leg ? ` en ${leg.destination}` : "";
  return `${items.length} ${items.length === 1 ? "experiencia" : "experiencias"}${destSuffix}.`;
}

function narrateTransfersDone(items: Transfer[], leg: TripLeg | null): string | null {
  if (items.length === 0) return null;
  const destSuffix = leg ? ` en ${leg.destination}` : "";
  return `${items.length} ${items.length === 1 ? "opción de traslado" : "opciones de traslado"}${destSuffix}.`;
}

function narrateSectionError(
  section: QuoteSection,
  error: string,
  skipped: boolean,
  leg: TripLeg | null,
): string {
  const where = leg ? ` en ${leg.destination}` : "";
  if (skipped) {
    return `Sin ${SECTION_LABEL[section]}${where} esta vez (${shortError(error)}). Sigo con el resto.`;
  }
  return `Error buscando ${SECTION_LABEL[section]}${where}: ${shortError(error)}.`;
}

function formatStay(leg: TripLeg | null): string {
  if (!leg) return "las fechas pedidas";
  const arr = new Date(leg.arrivalDate);
  const dep = new Date(leg.departureDate);
  const nights = Math.max(1, Math.round((dep.getTime() - arr.getTime()) / 86_400_000));
  return `${nights} ${nights === 1 ? "noche" : "noches"} (${formatDate(leg.arrivalDate)} a ${formatDate(leg.departureDate)})`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function formatPrice(amount: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency;
  return `${Math.round(amount)} ${symbol}`;
}

function shortError(error: string): string {
  const cleaned = error.replace(/^[A-Za-z]+(?:Api|Error)?:\s*/, "");
  return cleaned.length > 80 ? cleaned.slice(0, 77) + "…" : cleaned;
}

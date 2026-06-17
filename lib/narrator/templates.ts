import type { BuildEvent, QuoteSection, RecommendationEvent } from "@/lib/quote-conversation/types";
import type { ParsedTripInput, QuoteItem } from "@/lib/quotes/build-quote";
import { providerSlug } from "@/lib/connectors/provider-logo";
import { getEntry, type ServiceCategory } from "@/lib/recommendations/catalog";

const SECTION_LABEL: Record<QuoteSection, string> = {
  flights: "vuelos",
  hotels: "hoteles",
  experiences: "experiencias",
  transfers: "traslados",
};

type NarratableFlight = {
  carrier: string;
  price: number;
  currency: string;
};

type NarratableHotel = {
  provider: string;
  name: string;
  netPrice: number;
  currency: string;
};

function flightFromItem(item: QuoteItem): NarratableFlight {
  return {
    carrier: item.flightDetails?.airline ?? item.provider,
    price: item.price,
    currency: "EUR",
  };
}

function hotelFromItem(item: QuoteItem): NarratableHotel {
  const slug = providerSlug(item.provider);
  let provider = "other";
  if (item.source === "inventory") provider = "own";
  else if (slug === "hotelbeds") provider = "hotelbeds";
  else if (slug === "booking") provider = "booking";

  return {
    provider,
    name: item.title.split(" — ")[0] ?? item.title,
    netPrice: item.hotelDetails?.netPrice ?? item.price,
    currency: "EUR",
  };
}

export function narrateBuildEvent(
  event: BuildEvent,
  parsed: ParsedTripInput,
): string | null {
  switch (event.type) {
    case "section.started":
      return narrateSectionStarted(event.section, parsed);

    case "section.done":
      switch (event.section) {
        case "flights":
          return narrateFlightsDone(
            (event.results as QuoteItem[]).map(flightFromItem),
            parsed,
          );
        case "hotels":
          return narrateHotelsDone(
            (event.results as QuoteItem[]).map(hotelFromItem),
            parsed,
          );
        case "experiences":
          return narrateExperiencesDone(event.results as QuoteItem[]);
        case "transfers":
          return narrateTransfersDone(event.results as QuoteItem[]);
      }
      return null;

    case "section.error":
      return narrateSectionError(event.section, event.error, event.skipped);

    case "build.started":
    case "build.done":
    case "build.error":
    case "section.partial":
    case "section.provider":
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
  parsed: ParsedTripInput,
): string {
  const destination = parsed.destination ?? "el destino";
  const origin = parsed.origin;

  switch (section) {
    case "flights":
      return origin
        ? `Buscando vuelos ${origin} → ${destination}…`
        : `Buscando vuelos a ${destination}…`;
    case "hotels":
      return `Mirando hoteles en ${destination} para ${formatStay(parsed)}…`;
    case "experiences":
      return `Mirando experiencias disponibles en ${destination}…`;
    case "transfers":
      return `Comprobando traslados desde el aeropuerto…`;
  }
}

function narrateFlightsDone(
  flights: NarratableFlight[],
  _parsed: ParsedTripInput,
): string | null {
  if (flights.length === 0) {
    return `No encontré vuelos disponibles para esas fechas. Si el cliente tiene flexibilidad, podemos mover un día arriba o abajo.`;
  }

  const cheapest = flights.reduce(
    (min, flight) => (flight.price < min.price ? flight : min),
    flights[0],
  );
  const carriers = Array.from(
    new Set(flights.map((flight) => flight.carrier).filter(Boolean)),
  );

  if (flights.length === 1) {
    return `Encontré 1 vuelo: ${cheapest.carrier} a ${formatPrice(cheapest.price, cheapest.currency)}.`;
  }

  if (carriers.length === 1) {
    return `Encontré ${flights.length} opciones con ${carriers[0]} desde ${formatPrice(cheapest.price, cheapest.currency)}.`;
  }

  const carrierList = carriers.slice(0, 3).join(", ");
  const more = carriers.length > 3 ? " y más" : "";
  return `Encontré ${flights.length} opciones de vuelo desde ${formatPrice(cheapest.price, cheapest.currency)} con ${carrierList}${more}.`;
}

function narrateHotelsDone(
  hotels: NarratableHotel[],
  _parsed: ParsedTripInput,
): string | null {
  if (hotels.length === 0) {
    return `No tengo hoteles para enseñarte con esos parámetros. Voy a ver si relajando el nivel hay más disponibilidad.`;
  }

  const own = hotels.filter((hotel) => hotel.provider === "own");
  const hotelbeds = hotels.filter((hotel) => hotel.provider === "hotelbeds");
  const booking = hotels.filter((hotel) => hotel.provider === "booking");

  const parts: string[] = [];
  if (own.length > 0) {
    parts.push(
      `${own.length} ${own.length === 1 ? "hotel" : "hoteles"} de tu inventario`,
    );
  }
  if (hotelbeds.length > 0) {
    parts.push(
      `${hotelbeds.length} ${hotelbeds.length === 1 ? "opción" : "opciones"} en Hotelbeds`,
    );
  }
  if (booking.length > 0) {
    parts.push(
      `${booking.length} ${booking.length === 1 ? "opción" : "opciones"} en Booking`,
    );
  }

  const cheapest = hotels.reduce(
    (min, hotel) => (hotel.netPrice < min.netPrice ? hotel : min),
    hotels[0],
  );
  const summary = parts.join(", ").replace(/,([^,]*)$/, " y$1");

  return `Tengo ${summary}. La más económica está en ${formatPrice(cheapest.netPrice, cheapest.currency)}/noche.`;
}

function narrateExperiencesDone(experiences: QuoteItem[]): string | null {
  if (experiences.length === 0) return null;
  if (experiences.length === 1) return `Añadí 1 experiencia recomendada.`;
  return `Añadí ${experiences.length} experiencias para considerar.`;
}

function narrateTransfersDone(transfers: QuoteItem[]): string | null {
  if (transfers.length === 0) return null;
  if (transfers.length === 1) return `Incluyo traslado desde el aeropuerto.`;
  return `Tengo ${transfers.length} opciones de traslado.`;
}

function narrateSectionError(
  section: QuoteSection,
  error: string,
  skipped: boolean,
): string {
  if (skipped) {
    return `Sin ${SECTION_LABEL[section]} esta vez (${shortError(error)}). Sigo con el resto.`;
  }
  return `Hubo un problema buscando ${SECTION_LABEL[section]}: ${shortError(error)}.`;
}

function formatStay(parsed: ParsedTripInput): string {
  const checkIn = parsed.dates?.start;
  const checkOut = parsed.dates?.end;
  if (!checkIn || !checkOut) return "las fechas pedidas";
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86_400_000),
  );
  return `${nights} ${nights === 1 ? "noche" : "noches"} (${formatDate(checkIn)} a ${formatDate(checkOut)})`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function formatPrice(amount: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency;
  const rounded = Math.round(amount);
  return `${rounded} ${symbol}`;
}

function shortError(error: string): string {
  const cleaned = error.replace(/^[A-Za-z]+(?:Api|Error)?:\s*/, "");
  if (cleaned.length > 80) return cleaned.slice(0, 77) + "…";
  return cleaned;
}

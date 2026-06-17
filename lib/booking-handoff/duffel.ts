import type {
  BookingHandoffStrategy,
  BookingHandoff,
  HandoffAction,
} from "./types";
import type { Flight } from "@/lib/quote-engine/types";

export const duffelStrategy: BookingHandoffStrategy<Flight> = {
  provider: "duffel",
  itemKind: "flight",

  buildHandoff(flight, ctx): BookingHandoff {
    const airlineUrl = ctx.agencyConfig.preferredAirlineSites[flight.carrier];
    const flightSummary = buildFlightSummary(flight);

    const primary: HandoffAction = airlineUrl
      ? {
          kind: "open_url",
          url: airlineUrl,
          label: `Abrir ${flight.carrierName ?? flight.carrier}`,
          openInNewTab: true,
        }
      : {
          kind: "copy_text",
          text: flightSummary,
          label: "Copiar datos del vuelo",
          description:
            "Información del vuelo en texto plano para reservar en el sitio de la aerolínea.",
        };

    const secondary: HandoffAction[] = [];

    if (airlineUrl) {
      secondary.push({
        kind: "copy_text",
        text: flightSummary,
        label: "Copiar datos del vuelo",
        description: "Resumen del vuelo en texto plano.",
      });
    }

    if (flight.offerId) {
      secondary.push({
        kind: "copy_text",
        text: flight.offerId,
        label: "Copiar offer ID de Duffel",
        description: "Identificador interno de la oferta. Válido durante el TTL de Duffel.",
      });
    }

    if (flight.locator) {
      secondary.push({
        kind: "copy_text",
        text: flight.locator,
        label: "Copiar locator",
        description: "Identificador de reserva pre-asignado.",
      });
    }

    return {
      itemId: flight.id,
      provider: "duffel",
      itemKind: "flight",
      primary,
      secondary,
    };
  },
};

function buildFlightSummary(flight: Flight): string {
  const segments = flight.slices?.map((s) => {
    const seg0 = s.segments?.[0];
    const segLast = s.segments?.[s.segments.length - 1];
    if (!seg0 || !segLast) return null;
    return [
      `${seg0.origin.iata_code} → ${segLast.destination.iata_code}`,
      `${s.departureDate} ${seg0.departureTime ?? ""}`,
      `vuelo ${seg0.flightNumber ?? ""}`,
    ]
      .filter(Boolean)
      .join(" · ");
  });

  return [
    `Aerolínea: ${flight.carrierName ?? flight.carrier}`,
    ...((segments?.filter(Boolean) as string[]) ?? [
      `Ruta: ${flight.origin ?? "?"} → ${flight.destination ?? "?"}`,
    ]),
    `Precio cotizado: ${flight.price} ${flight.currency}`,
  ].join("\n");
}

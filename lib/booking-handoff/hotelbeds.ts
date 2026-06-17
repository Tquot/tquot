import type {
  BookingHandoffStrategy,
  BookingHandoff,
  HandoffAction,
} from "./types";
import type { Hotel } from "@/lib/quote-engine/types";

const RATEKEY_TTL_MS = 30 * 60 * 1000;

export const hotelbedsStrategy: BookingHandoffStrategy<Hotel> = {
  provider: "hotelbeds",
  itemKind: "hotel",

  buildHandoff(hotel, ctx): BookingHandoff {
    const extranetUrl = ctx.agencyConfig.hotelbedsExtranetUrl;
    const legId = hotel.legId;
    const leg = ctx.parsed.legs.find((l) => l.id === legId);

    const secondary: HandoffAction[] = [];

    if (hotel.hotelCode) {
      secondary.push({
        kind: "copy_text",
        text: hotel.hotelCode,
        label: "Copiar código de hotel",
        description: `Pega ${hotel.hotelCode} en la búsqueda de Hotelbeds para encontrar este hotel.`,
      });
    }

    if (hotel.rateKey) {
      secondary.push({
        kind: "copy_text",
        text: hotel.rateKey,
        label: "Copiar rateKey",
        description: "Token de tarifa válido aprox. 30 minutos desde la cotización.",
      });
    }

    if (leg) {
      const occupancyLine = ctx.quote.group
        ? `${ctx.quote.group.distribution.totalRooms} habitaciones (${formatDistribution(ctx.quote.group.distribution)})`
        : `1 habitación (${ctx.parsed.travelers.adults} ad${ctx.parsed.travelers.children.length > 0 ? `, ${ctx.parsed.travelers.children.length} niños` : ""})`;

      const summary = [
        `Hotel: ${hotel.name}`,
        `Código: ${hotel.hotelCode ?? "sin código"}`,
        `Check-in: ${leg.arrivalDate}`,
        `Check-out: ${leg.departureDate}`,
        occupancyLine,
        `Precio cotizado: ${hotel.netPrice} ${hotel.currency}/noche${hotel.totalForGroup ? ` · total ${hotel.totalForGroup} ${hotel.currency}` : ""}`,
      ].join("\n");

      secondary.push({
        kind: "copy_text",
        text: summary,
        label: "Copiar resumen",
        description: "Toda la información del booking en texto plano.",
      });
    }

    return {
      itemId: hotel.id,
      provider: "hotelbeds",
      itemKind: "hotel",
      primary: {
        kind: "open_url",
        url: extranetUrl,
        label: "Abrir Hotelbeds",
        openInNewTab: true,
      },
      secondary,
      metadata: hotel.fetchedAt
        ? {
            expiresAt: new Date(
              new Date(hotel.fetchedAt).getTime() + RATEKEY_TTL_MS,
            ).toISOString(),
          }
        : undefined,
    };
  },
};

function formatDistribution(d: {
  doubles: number;
  singles: number;
  triples: number;
}): string {
  const parts: string[] = [];
  if (d.doubles > 0) parts.push(`${d.doubles} dobles`);
  if (d.singles > 0) parts.push(`${d.singles} individuales`);
  if (d.triples > 0) parts.push(`${d.triples} triples`);
  return parts.join(" + ");
}

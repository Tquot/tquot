import type { BookingHandoffStrategy, BookingHandoff, HandoffAction } from "./types";
import type { Hotel } from "@/lib/quote-engine/types";

export const bookingComStrategy: BookingHandoffStrategy<Hotel> = {
  provider: "booking",
  itemKind: "hotel",

  buildHandoff(hotel, ctx): BookingHandoff {
    const leg = ctx.parsed.legs.find((l) => l.id === hotel.legId);
    if (!leg) {
      return fallbackHandoff(hotel);
    }

    const params = new URLSearchParams({
      ss: hotel.name,
      checkin: leg.arrivalDate,
      checkout: leg.departureDate,
      group_adults: String(ctx.parsed.travelers.adults),
      group_children: String(ctx.parsed.travelers.children.length),
      no_rooms: "1",
    });

    if (ctx.parsed.travelers.children.length > 0) {
      ctx.parsed.travelers.children.forEach((c) => {
        params.append("age", String(c.age));
      });
    }

    const deepLink = `https://www.booking.com/searchresults.${ctx.agencyConfig.defaultLocale.slice(0, 2)}.html?${params.toString()}`;

    return {
      itemId: hotel.id,
      provider: "booking",
      itemKind: "hotel",
      primary: {
        kind: "open_url",
        url: deepLink,
        label: "Abrir en Booking",
        openInNewTab: true,
      },
      secondary: [
        {
          kind: "copy_text",
          text: hotel.name,
          label: "Copiar nombre del hotel",
          description: "Para buscar manualmente si el deep link no encuentra el hotel.",
        },
        {
          kind: "copy_text",
          text: deepLink,
          label: "Copiar URL",
          description: "URL de búsqueda en Booking con todos los parámetros.",
        },
      ],
    };
  },
};

function fallbackHandoff(hotel: Hotel): BookingHandoff {
  return {
    itemId: hotel.id,
    provider: "booking",
    itemKind: "hotel",
    primary: {
      kind: "open_url",
      url: "https://www.booking.com",
      label: "Abrir Booking",
      openInNewTab: true,
    },
    secondary: [
      {
        kind: "copy_text",
        text: hotel.name,
        label: "Copiar nombre del hotel",
        description: "Para buscar manualmente.",
      },
    ],
  };
}

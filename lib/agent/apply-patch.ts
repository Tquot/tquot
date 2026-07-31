import type { Quote } from "@/lib/quotes/build-quote";
import {
  selectPrimaryInGroup,
  syncQuotePricing,
} from "@/lib/quotes/build-quote";
import type { QuotePatch } from "./types";

export type ApplyPatchResult = {
  quote: Quote;
  dismissed: string[];
  message?: string;
};

/**
 * Aplica un patch del agente sobre la cotización en memoria.
 * dismissSuggestion solo actualiza la lista de descartes.
 */
export function applyQuotePatch(
  quote: Quote,
  dismissed: string[],
  patch: QuotePatch,
): ApplyPatchResult {
  if (patch.type === "dismissSuggestion") {
    const next = dismissed.includes(patch.id)
      ? dismissed
      : [...dismissed, patch.id];
    return { quote, dismissed: next };
  }

  const next = structuredClone(quote);

  switch (patch.type) {
    case "selectFlight": {
      const exists = next.flights.some((f) => f.id === patch.flightId);
      if (exists) {
        try {
          selectPrimaryInGroup(next, patch.flightId);
        } catch {
          for (const f of next.flights) {
            f.alternative = f.id !== patch.flightId;
          }
        }
      }
      syncQuotePricing(next);
      return { quote: next, dismissed, message: "Cambiado el vuelo." };
    }
    case "selectHotel": {
      const exists = next.hotels.some((h) => h.id === patch.hotelId);
      if (exists) {
        try {
          selectPrimaryInGroup(next, patch.hotelId);
        } catch {
          for (const h of next.hotels) {
            h.alternative = h.id !== patch.hotelId;
          }
        }
      }
      syncQuotePricing(next);
      return { quote: next, dismissed, message: "Cambiado el hotel." };
    }
    case "setBoard": {
      const hotel = next.hotels.find((h) => h.id === patch.hotelId);
      if (hotel?.hotelDetails) {
        hotel.hotelDetails.boardCode = patch.boardCode;
        const opt = hotel.hotelDetails.boardOptions?.find(
          (b) => b.boardCode === patch.boardCode,
        );
        if (opt) {
          hotel.price = opt.totalPrice;
          const margin = hotel.markup;
          hotel.finalPrice = hotel.price + margin;
        }
      }
      syncQuotePricing(next);
      return { quote: next, dismissed, message: `Régimen ${patch.boardCode}.` };
    }
    case "addInsurance":
    case "addTransfer":
    case "switchProvider":
      // Acciones que requieren rebuild/provider: el caller encola refine.
      return {
        quote: next,
        dismissed,
        message: "Anoto el cambio; lo aplico en el siguiente paso.",
      };
    case "setField":
      // El store aplica el cambio sobre parsed + rebuild; aquí solo ack.
      return {
        quote: next,
        dismissed,
        message: "Cambio anotado.",
      };
    default:
      return { quote: next, dismissed };
  }
}

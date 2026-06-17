import type {
  RefinementIntent,
  RefinementImpact,
  QuoteSection,
} from "@/lib/quote-conversation/types";
import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import type { RefineAction } from "@/lib/quotes/refine/types";

export function intentToOperation(
  intent: RefinementIntent,
  quote: Quote,
  parsed: ParsedTripInput,
): RefineAction | null {
  switch (intent.kind) {
    case "change_hotel":
      if (/barat|cheap|económic/i.test(intent.criteria)) {
        return { action: "cheaper" };
      }
      return {
        action: "change_hotel_level",
        params: { preference: intent.criteria },
      };

    case "change_flight":
      if (/direct/i.test(intent.criteria)) {
        return { action: "filter_direct_flights" };
      }
      return { action: "cheaper" };

    case "change_dates":
      return null;

    case "add_service":
      if (/seguro|insurance/i.test(intent.service)) {
        const days = Math.max(1, quote.summary.durationDays - 1);
        const pax = quote.summary.passengers.total;
        return {
          action: "add_insurance",
          params: {
            destination: parsed.destination,
            days,
            pax,
          },
        };
      }
      if (/experien|excurs|tour|actividad/i.test(intent.service)) {
        return {
          action: "add_experience",
          params: { type: intent.service },
        };
      }
      return { action: "search_web", params: { query: intent.service } };

    case "remove_service":
      return null;

    case "change_pax":
      return null;

    case "change_budget": {
      const levelMap = {
        budget: "budget",
        mid: "standard",
        premium: "premium",
        luxury: "luxury",
      } as const;
      const level = intent.tier ? levelMap[intent.tier] : undefined;
      return {
        action: "change_hotel_level",
        params: { level },
      };
    }

    case "free_text":
      return null;
  }
}

export function estimateImpact(
  operation: RefineAction,
  quote: Quote,
): RefinementImpact {
  switch (operation.action) {
    case "change_hotel_level": {
      const current = quote.hotels[0];
      const baseline = current?.hotelDetails?.netPrice ?? current?.price ?? 0;
      const criteria = operation.params.preference ?? "";
      const goingDown = /barat|económic|low|cheap/i.test(criteria);
      const goingUp = /lujo|premium|mejor|alto/i.test(criteria);
      const direction = goingDown ? "down" : goingUp ? "up" : "unknown";
      const nights = Math.max(1, quote.summary.durationDays - 1);
      const totalCurrent = baseline * nights;
      const min = direction === "down" ? totalCurrent * 0.5 : totalCurrent * 0.9;
      const max = direction === "up" ? totalCurrent * 1.6 : totalCurrent * 1.1;

      return {
        affectedSections: ["hotels"],
        priceChangeEstimate: {
          min: Math.round(min),
          max: Math.round(max),
          currency: quote.pricing.currency,
          direction,
        },
        reasoning: `Sustituyendo el hotel actual (${current?.title ?? "sin hotel"}) por una opción con criterio "${criteria || operation.params.level || "ajustado"}".`,
      };
    }

    case "cheaper":
      return {
        affectedSections: ["hotels", "flights"],
        priceChangeEstimate: {
          min: 0,
          max: Math.round(quote.pricing.finalTotal * 0.3),
          currency: quote.pricing.currency,
          direction: "down",
        },
        reasoning: "Buscar opciones más económicas en la cotización.",
      };

    case "filter_direct_flights":
      return {
        affectedSections: ["flights"],
        reasoning: "Filtrar vuelos directos.",
      };

    case "add_insurance":
    case "add_experience":
    case "search_web":
      return {
        affectedSections: inferSectionsFromAction(operation),
        priceChangeEstimate: {
          min: 0,
          max: 500,
          currency: quote.pricing.currency,
          direction: "up",
        },
        reasoning: `Añadir servicio relacionado con la petición.`,
      };

    default:
      return {
        affectedSections: [],
        reasoning: "Cambio no estructurado.",
      };
  }
}

function inferSectionsFromAction(action: RefineAction): QuoteSection[] {
  switch (action.action) {
    case "add_experience":
      return ["experiences"];
    case "add_insurance":
      return [];
    case "search_web":
      return ["hotels"];
    default:
      return [];
  }
}

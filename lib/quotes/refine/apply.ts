import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import { rebuildHotelsSection } from "@/lib/quotes/build-quote";
import { searchInventoryForQuote } from "@/lib/inventory/search-for-quote";
import {
  inventoryRowToExperienceQuoteItem,
  searchExperienceForRefine,
} from "@/lib/quotes/refine/inventory-experience";
import {
  inventoryRowToInsuranceQuoteItem,
  mockInsuranceToQuoteItem,
  searchInsuranceInventory,
} from "@/lib/quotes/refine/inventory-insurance";
import { pickMockInsurance } from "@/lib/quotes/refine/mock-insurance";
import type { RefineAction, RefineApplyResult } from "@/lib/quotes/refine/types";
import { searchWebSuggestion } from "@/lib/quotes/refine/web-search";

function hasInsuranceItem(quote: Quote): boolean {
  return quote.experiences.some((item) => item.id.startsWith("exp-insurance"));
}

function hasExperienceId(quote: Quote, id: string): boolean {
  return quote.experiences.some((item) => item.id === id);
}

export async function applyServerRefinementAction(
  action: RefineAction,
  ctx: {
    userId: string;
    tripInput: ParsedTripInput;
    currentQuote: Quote;
    apiOrigin: string;
  },
): Promise<RefineApplyResult> {
  const { userId, tripInput, currentQuote, apiOrigin } = ctx;

  switch (action.action) {
    case "add_insurance": {
      if (hasInsuranceItem(currentQuote)) {
        return { message: "La cotización ya incluye un seguro de viaje." };
      }

      const pax = action.params.pax;
      const inventoryRow = await searchInsuranceInventory(
        userId,
        action.params.destination,
      );

      const item = inventoryRow
        ? inventoryRowToInsuranceQuoteItem(
            inventoryRow,
            pax,
            currentQuote.experiences.length > 0,
          )
        : mockInsuranceToQuoteItem(
            pickMockInsurance(action.params.destination),
            pax,
            currentQuote.experiences.length > 0,
          );

      return {
        message: inventoryRow
          ? `He añadido ${item.title} desde tu inventario.`
          : `He añadido ${item.title} (catálogo de referencia).`,
        patch: { experiences: [...currentQuote.experiences, item] },
      };
    }

    case "change_hotel_level": {
      const updatedTripInput: ParsedTripInput = {
        ...tripInput,
        preferences: {
          ...tripInput.preferences,
          hotelLevel: action.params.level,
        },
      };

      const durationDays = Math.max(
        1,
        Math.ceil(
          (Date.parse(updatedTripInput.dates.end) -
            Date.parse(updatedTripInput.dates.start)) /
            86_400_000,
        ),
      );

      const inventory = await searchInventoryForQuote(userId, {
        destination: updatedTripInput.destination,
        accessibility: updatedTripInput.preferences.accessibility,
        hotelLevel: updatedTripInput.preferences.hotelLevel,
        durationDays,
      });

      const hotelsResult = await rebuildHotelsSection(
        updatedTripInput,
        inventory,
        apiOrigin,
      );

      return {
        message: `He actualizado los hoteles a categoría ${action.params.level}.`,
        patch: {
          hotels: hotelsResult.items,
          _meta: {
            hotelsSource: hotelsResult.source,
            ...(hotelsResult.source === "mock" && hotelsResult.mockReason
              ? { hotelsMockReason: hotelsResult.mockReason }
              : {}),
          },
        },
        updatedTripInput,
      };
    }

    case "add_experience": {
      const row = await searchExperienceForRefine(
        userId,
        tripInput,
        action.params.type,
      );

      if (!row) {
        return {
          message: `No encontré experiencias de tipo «${action.params.type}» en tu inventario para este destino.`,
        };
      }

      const item = inventoryRowToExperienceQuoteItem(
        row,
        tripInput,
        currentQuote.experiences.length > 0,
      );

      if (hasExperienceId(currentQuote, item.id)) {
        return { message: "Esa experiencia ya está en la cotización." };
      }

      return {
        message: `He añadido ${item.title} desde tu inventario.`,
        patch: { experiences: [...currentQuote.experiences, item] },
      };
    }

    case "search_web": {
      const suggestion = await searchWebSuggestion(
        action.params.query,
        currentQuote,
        tripInput,
      );

      return {
        message: "Sugerencia de proveedor (orientativa):",
        suggestion,
      };
    }

    default:
      return {
        message: "Esta acción se procesa en el cliente.",
      };
  }
}

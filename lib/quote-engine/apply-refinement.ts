"use server";

/**
 * Persist a refined quote snapshot with versioning.
 *
 * Adaptación TQuot: el refine en memoria vive en el cliente; cuando hay
 * `quoteId` guardado, versionamos el snapshot previo y lo sobrescribimos.
 */

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Quote } from "@/lib/quote-engine/types";
import type { RefineAction } from "@/lib/quotes/refine/types";
import { createQuoteVersion } from "@/lib/versioning/snapshot-version";

export interface PersistRefinementInput {
  quoteId: string;
  previousSnapshot: Quote;
  newSnapshot: Quote;
  operation: RefineAction;
}

function summarizeRefinement(operation: RefineAction, prev: Quote): string {
  switch (operation.action) {
    case "change_hotel_level": {
      const hotelName = prev.hotels[0]?.title ?? "?";
      const criteria = [
        operation.params.level,
        operation.params.area,
        operation.params.preference,
      ]
        .filter(Boolean)
        .join(", ");
      return `Cambio de hotel "${hotelName}"${criteria ? ` con criterio "${criteria}"` : ""}`;
    }
    case "filter_direct_flights":
      return `Filtro de vuelos directos (${prev.flights[0]?.title ?? "vuelos"})`;
    case "cheaper":
      return "Optimización a opción más económica";
    case "add_insurance":
      return "Añadido servicio: seguro de viaje";
    case "add_experience":
      return `Añadido servicio: ${operation.params.type}`;
    case "search_web":
      return `Búsqueda web: ${operation.params.query}`;
    case "explain":
    case "unknown":
      return operation.params.text || "Refinamiento";
    default:
      return "Refinamiento";
  }
}

/**
 * Guarda versión previa + actualiza `quotes.snapshot` tras un refinement.
 */
export async function persistRefinementSnapshot(
  input: PersistRefinementInput,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const { data: row, error: loadError } = await supabase
    .from("quotes")
    .select("id, snapshot")
    .eq("id", input.quoteId)
    .maybeSingle();

  if (loadError || !row) {
    return { success: false, error: "quote_not_found" };
  }

  const previous =
    (row.snapshot as Quote | null) ?? input.previousSnapshot;

  await createQuoteVersion({
    quoteId: input.quoteId,
    snapshot: previous,
    changeKind: "refinement",
    changeSummary: summarizeRefinement(input.operation, previous),
  });

  const snapshotToSave = { ...input.newSnapshot };
  delete snapshotToSave.itinerary;

  const { error: updateError } = await supabase
    .from("quotes")
    .update({
      snapshot: snapshotToSave,
      total_net_cost: input.newSnapshot.pricing.baseTotal,
      total_margin: input.newSnapshot.pricing.margin,
      total_public_price: input.newSnapshot.pricing.finalTotal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.quoteId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * Alias cercano al spec (`applyRefinement`): versiona + escribe snapshot.
 * El patch de refine se calcula fuera (cliente / applyServerRefinementAction).
 */
export async function applyRefinement(input: PersistRefinementInput) {
  const result = await persistRefinementSnapshot(input);
  if (!result.success) {
    throw new Error(result.error ?? "apply_refinement_failed");
  }
  const quote = { ...input.newSnapshot };
  delete quote.itinerary;
  return { quote };
}

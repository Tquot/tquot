import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { loadBranding } from "@/lib/branding/loader";
import { generateItinerary } from "@/lib/itinerary/generator";
import type { Quote } from "@/lib/quote-engine/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { registerFonts } from "./fonts";
import { mapSnapshotToPremiumQuote } from "./map-premium-quote";
import { renderQuotePdf } from "./render";
import { PremiumQuotePDF } from "./templates/PremiumQuotePDF";
import { loadQuoteForPdf } from "./utils/load-quote";
import type { PdfVariant } from "./types";

export interface GenerateQuotePdfInput {
  quoteId: string;
  variant: PdfVariant;
  regenerateItinerary?: boolean;
}

export async function generateQuotePDF(
  input: GenerateQuotePdfInput,
): Promise<Buffer> {
  registerFonts();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("quotes")
    .select(
      "snapshot, agency_id, departure_date, return_date, destination, origin",
    )
    .eq("id", input.quoteId)
    .single();

  if (error || !data) {
    throw new Error(`quote_not_found: ${error?.message ?? "missing row"}`);
  }

  const snapshot = data.snapshot as Quote | null;

  if (!snapshot) {
    const legacyQuote = await loadQuoteForPdf(input.quoteId);
    if (!legacyQuote) throw new Error("quote_not_found");
    return renderQuotePdf(legacyQuote, input.variant);
  }

  if (snapshot.group) {
    const legacyQuote = await loadQuoteForPdf(input.quoteId);
    if (legacyQuote) return renderQuotePdf(legacyQuote, input.variant);
  }

  let engineQuote = snapshot;

  if (!engineQuote.itinerary || input.regenerateItinerary) {
    const itinerary = await generateItinerary({
      quoteId: input.quoteId,
      force: input.regenerateItinerary,
    });
    if (itinerary) {
      engineQuote = { ...engineQuote, itinerary };
    }
  }

  const branding = await loadBranding(data.agency_id);
  const premiumQuote = mapSnapshotToPremiumQuote(engineQuote, {
    departure_date: String(data.departure_date),
    return_date: String(data.return_date),
    destination: data.destination,
    origin: data.origin,
  });

  return await renderToBuffer(
    <PremiumQuotePDF
      quote={premiumQuote}
      branding={branding}
      variant={input.variant}
    />,
  );
}

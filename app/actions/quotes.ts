"use server";

import { z } from "zod";
import { getCurrentAgencyId, getCurrentUserId } from "@/lib/auth";
import {
  itemsForPricing,
  type ParsedTripInput,
  type Quote,
  type QuoteItem,
  type QuoteItemSource,
  type QuoteItemType,
} from "@/lib/quotes/build-quote";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ClientSelection } from "@/types/client";
import { upsertClient } from "./clients";

const SaveQuoteSchema = z.object({
  quote: z.unknown(),
  tripInput: z.unknown(),
  agentNotes: z.string().optional(),
  client: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("new"),
      data: z.object({
        name: z.string().min(1),
        email: z.string().email().nullable().optional(),
        phone: z.string().nullable().optional(),
      }),
    }),
    z.object({ kind: z.literal("existing"), id: z.string().uuid() }),
    z.object({ kind: z.literal("skip") }),
  ]),
});

type LineItemCategory = "flight" | "hotel" | "activity";
type DbPriceSource = "INV_PROPIO" | "CORPORATIVO" | "WEB";

function mapItemTypeToCategory(type: QuoteItemType): LineItemCategory {
  if (type === "flight") return "flight";
  if (type === "hotel") return "hotel";
  return "activity";
}

function mapItemSourceToDb(source: QuoteItemSource): DbPriceSource {
  if (source === "inventory") return "INV_PROPIO";
  return "WEB";
}

function lineMarginPercent(item: QuoteItem): number {
  if (item.marginPercent !== undefined && Number.isFinite(item.marginPercent)) {
    return item.marginPercent;
  }
  if (item.price > 0) {
    return (item.markup / item.price) * 100;
  }
  return 0;
}

function addDaysIso(date: Date, days: number): string {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy.toISOString().slice(0, 10);
}

function collectPricedItems(quote: Quote): QuoteItem[] {
  return [
    ...itemsForPricing(quote.flights),
    ...itemsForPricing(quote.transfers),
    ...itemsForPricing(quote.hotels),
    ...itemsForPricing(quote.experiences),
  ];
}

export async function saveQuoteWithClient(input: {
  quote: Quote;
  tripInput: ParsedTripInput;
  agentNotes?: string;
  client: ClientSelection;
}): Promise<{ quoteId: string; clientId: string | null }> {
  const parsed = SaveQuoteSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`invalid_save_input: ${parsed.error.message}`);
  }

  const supabase = await createServerSupabaseClient();
  const agencyId = await getCurrentAgencyId();
  const userId = await getCurrentUserId();
  if (!agencyId || !userId) throw new Error("no_agency_context");

  const { client, quote, tripInput, agentNotes } = parsed.data as {
    client: ClientSelection;
    quote: Quote;
    tripInput: ParsedTripInput;
    agentNotes?: string;
  };

  let clientId: string | null = null;

  if (client.kind === "existing") {
    const { data, error } = await supabase
      .from("clients")
      .select("id")
      .eq("id", client.id)
      .eq("user_id", userId)
      .single();
    if (error || !data) throw new Error("client_not_found_in_agency");
    clientId = data.id;
  } else if (client.kind === "new") {
    const result = await upsertClient(client.data);
    clientId = result.id;
  }

  const { baseTotal, margin, finalTotal, currency } = quote.pricing;
  const totalMarginPercent = baseTotal > 0 ? (margin / baseTotal) * 100 : 0;
  const nights = Math.max(0, quote.summary.durationDays - 1);

  const { data: inserted, error: insErr } = await supabase
    .from("quotes")
    .insert({
      user_id: userId,
      agency_id: agencyId,
      agent_id: userId,
      client_id: clientId,
      reference: `${quote.id}-${Date.now()}`,
      valid_until: addDaysIso(new Date(), 30),
      origin: tripInput.origin,
      destination: tripInput.destination,
      departure_date: tripInput.dates.start,
      return_date: tripInput.dates.end,
      nights,
      adults: tripInput.passengers.adults,
      children: tripInput.passengers.children,
      infants: 0,
      purpose: "",
      total_net_cost: baseTotal,
      total_margin: margin,
      total_margin_percent: totalMarginPercent,
      total_public_price: finalTotal,
      currency,
      agent_notes: agentNotes ?? null,
      client_message: null,
      payment_terms: null,
      cancellation_policy: null,
    })
    .select("id")
    .single();

  if (insErr) throw new Error(`quote_insert_failed: ${insErr.message}`);

  const quoteId = inserted.id as string;
  const pricedItems = collectPricedItems(quote);

  if (pricedItems.length > 0) {
    const lineRows = pricedItems.map((item, index) => ({
      quote_id: quoteId,
      sort_order: index,
      category: mapItemTypeToCategory(item.type),
      description: item.title,
      subtitle: item.description ?? null,
      net_cost: item.price,
      margin: item.markup,
      margin_percent: lineMarginPercent(item),
      public_price: item.finalPrice,
      source: mapItemSourceToDb(item.source),
      supplier: item.provider,
      internal_notes: null,
      per_person: false,
      pax_count: 1,
    }));

    const { error: lineItemsError } = await supabase
      .from("quote_line_items")
      .insert(lineRows);

    if (lineItemsError) {
      await supabase.from("quotes").delete().eq("id", quoteId);
      throw new Error(`quote_line_items_failed: ${lineItemsError.message}`);
    }
  }

  return { quoteId, clientId };
}

export async function refreshHotelPrice({
  hotel,
  searchContext,
}: {
  hotel: import("@/lib/quote-engine/types").HotelDetails;
  searchContext: {
    destination: string;
    checkIn: string;
    checkOut: string;
    guests: { adults: number; children?: number }[];
  };
}): Promise<
  Pick<
    import("@/lib/quote-engine/types").HotelDetails,
    "netPrice" | "rateKey" | "fetchedAt" | "currency"
  >
> {
  const { queryHotelbedsPrice } = await import("@/lib/providers/hotelbeds");
  const { queryBookingPrice } = await import("@/lib/providers/booking");

  const params = {
    hotelName: hotel.name,
    destination: searchContext.destination,
    checkIn: searchContext.checkIn,
    checkOut: searchContext.checkOut,
    guests: searchContext.guests,
  };

  const fresh =
    hotel.provider === "hotelbeds"
      ? await queryHotelbedsPrice(params, {
          connectionId: hotel.connectionId,
          hotelCode: hotel.hotelCode,
        })
      : hotel.provider === "booking"
        ? await queryBookingPrice(params)
        : (() => {
            throw new Error("provider_refresh_not_supported");
          })();

  return {
    netPrice: fresh.netPrice,
    rateKey: fresh.rateKey,
    fetchedAt: new Date().toISOString(),
    currency: fresh.currency,
  };
}

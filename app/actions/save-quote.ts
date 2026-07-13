"use server";

import { getAuthenticatedUser } from "@/app/api/parser/_auth";
import {
  itemsForPricing,
  type ParsedTripInput,
  type Quote,
  type QuoteItem,
  type QuoteItemSource,
  type QuoteItemType,
} from "@/lib/quotes/build-quote";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";

type SaveQuoteArgs = {
  quote: Quote;
  tripInput: ParsedTripInput;
  agentNotes?: string;
  clientName?: string;
  clientEmail?: string;
};

type SaveQuoteSuccess = { ok: true; quoteId: string };
type SaveQuoteError = { ok: false; error: string };

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

async function upsertClientForQuote(
  userId: string,
  clientName?: string,
  clientEmail?: string,
): Promise<string | null> {
  const supabase: SupabaseClient = createServiceClient();
  const name = clientName?.trim();
  const email = clientEmail?.trim();

  console.log("[upsertClient] called with:", { name, email, userId });

  if (!name && !email) {
    console.log("[upsertClient] early return: no name and no email");
    console.log("[upsertClient] returning clientId:", null);
    return null;
  }

  const fullName = name || email!.split("@")[0] || "Cliente";
  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  console.log("[upsertClient] resolved:", { fullName, normalizedEmail });

  // 1) Match by email when provided
  if (normalizedEmail) {
    const { data: existing, error: selErr } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", userId)
      .ilike("email", normalizedEmail)
      .maybeSingle();

    console.log("[upsertClient] select by email result:", {
      data: existing,
      error: selErr,
    });

    if (selErr) {
      console.error("[upsertClient] Supabase select error:", selErr);
      throw new Error(selErr.message);
    }
    if (existing?.id) {
      const { data: updated, error: updateErr } = await supabase
        .from("clients")
        .update({
          full_name: fullName,
          email: normalizedEmail,
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      console.log("[upsertClient] update existing client result:", {
        data: updated,
        error: updateErr,
      });

      if (updateErr) {
        console.error("[upsertClient] Supabase update error:", updateErr);
        throw new Error(updateErr.message);
      }
      const clientId = existing.id as string;
      console.log("[upsertClient] returning clientId:", clientId);
      return clientId;
    }
  }

  // 2) Name-only: find existing client by full_name when email is empty
  if (name && !normalizedEmail) {
    const { data: existingByName, error: nameSelErr } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", userId)
      .ilike("full_name", name)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("[upsertClient] select by name result:", {
      data: existingByName,
      error: nameSelErr,
    });

    if (nameSelErr) {
      console.error("[upsertClient] Supabase select-by-name error:", nameSelErr);
      throw new Error(nameSelErr.message);
    }
    if (existingByName?.id) {
      const clientId = existingByName.id as string;
      console.log("[upsertClient] returning clientId (matched by name):", clientId);
      return clientId;
    }
  }

  // 3) Create new client
  const { data: inserted, error: insErr } = await supabase
    .from("clients")
    .insert({
      user_id: userId,
      full_name: fullName,
      email: normalizedEmail,
    })
    .select("id")
    .single();

  console.log("[upsertClient] insert client result:", {
    data: inserted,
    error: insErr,
  });

  if (insErr) {
    console.error("[upsertClient] Supabase insert error:", insErr);
    throw new Error(insErr.message ?? "Error al guardar el cliente");
  }
  if (!inserted) throw new Error("Error al guardar el cliente");

  const clientId = inserted.id as string;
  console.log("[upsertClient] returning clientId:", clientId);
  return clientId;
}

export async function saveQuote(
  args: SaveQuoteArgs,
): Promise<SaveQuoteSuccess | SaveQuoteError> {
  try {
    console.log("[saveQuote] called with", {
      clientName: args.clientName,
      clientEmail: args.clientEmail,
      hasQuote: !!args.quote,
    });

    const auth = await getAuthenticatedUser();
    if (auth.response) {
      return { ok: false, error: "No autenticado" };
    }

    const supabase = await createServerSupabaseClient();
    const userId = auth.user.id;

    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (agencyError) {
      return { ok: false, error: agencyError.message };
    }

    if (!agency) {
      return {
        ok: false,
        error: "Agencia no configurada. Crea tu agencia antes de guardar.",
      };
    }

    const { baseTotal, margin, finalTotal, currency } = args.quote.pricing;
    const totalMarginPercent = baseTotal > 0 ? (margin / baseTotal) * 100 : 0;
    const nights = Math.max(0, args.quote.summary.durationDays - 1);

    console.log("[saveQuote] calling upsertClientForQuote with:", {
      clientName: args.clientName,
      clientEmail: args.clientEmail,
      userId: auth.user.id,
    });
    const clientId = await upsertClientForQuote(
      userId,
      args.clientName,
      args.clientEmail,
    );
    console.log("[saveQuote] upsertClientForQuote returned clientId:", clientId);

    const thirtyDaysFromNow = addDaysIso(new Date(), 30);
    const dayAfterDeparture = addDaysIso(
      new Date(args.tripInput.dates.start),
      1,
    );
    const validUntil =
      thirtyDaysFromNow >= dayAfterDeparture
        ? thirtyDaysFromNow
        : dayAfterDeparture;
    console.log("[saveQuote] dates:", {
      departure: args.tripInput.dates.start,
      validUntil,
      thirtyDaysFromNow,
      dayAfterDeparture,
    });

    console.log("[saveQuote] quote insert will use client_id:", clientId);
    const { data: insertedQuote, error: quoteInsertError } = await supabase
      .from("quotes")
      .insert({
        user_id: userId,
        agency_id: agency.id,
        agent_id: userId,
        client_id: clientId,
        reference: `${args.quote.id}-${Date.now()}`,
        valid_until: validUntil,
        origin: args.tripInput.origin,
        destination: args.tripInput.destination,
        departure_date: args.tripInput.dates.start,
        return_date: args.tripInput.dates.end,
        nights,
        adults: args.tripInput.passengers.adults,
        children: args.tripInput.passengers.children,
        infants: 0,
        purpose: "",
        total_net_cost: baseTotal,
        total_margin: margin,
        total_margin_percent: totalMarginPercent,
        total_public_price: finalTotal,
        currency,
        agent_notes: args.agentNotes ?? null,
        client_message: null,
        payment_terms: null,
        cancellation_policy: null,
        snapshot: args.quote,
      })
      .select("id")
      .single();

    if (quoteInsertError || !insertedQuote) {
      const message = quoteInsertError?.message ?? "Error al guardar la cotización";
      if (quoteInsertError?.code === "23505") {
        return {
          ok: false,
          error:
            "Ya existe una cotización guardada con esta referencia. Modifica el viaje o guarda de nuevo más tarde.",
        };
      }
      return { ok: false, error: message };
    }

    const quoteId = insertedQuote.id as string;

    try {
      const { createQuoteVersion } = await import(
        "@/lib/versioning/snapshot-version"
      );
      await createQuoteVersion({
        quoteId,
        snapshot: args.quote,
        changeKind: "initial",
        changeSummary: "Versión inicial al guardar",
      });
    } catch (versionError) {
      console.error("[saveQuote] version create failed:", versionError);
    }

    const pricedItems = collectPricedItems(args.quote);

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
        hotel_code:
          item.type === "hotel" ? (item.hotelDetails?.hotelCode ?? null) : null,
      }));

      const { error: lineItemsError } = await supabase
        .from("quote_line_items")
        .insert(lineRows);

      if (lineItemsError) {
        await supabase.from("quotes").delete().eq("id", quoteId);
        return { ok: false, error: lineItemsError.message };
      }
    }

    return { ok: true, quoteId };
  } catch (error) {
    console.error("[saveQuote] FATAL ERROR:", error);
    throw error;
  }
}

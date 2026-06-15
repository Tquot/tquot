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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function upsertClientForQuote(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  clientName?: string,
  clientEmail?: string,
): Promise<string | null> {
  console.log("[upsertClientForQuote] received", {
    clientName,
    clientEmail,
    userId,
  });

  const name = clientName?.trim();
  const email = clientEmail?.trim();

  if (!name && !email) {
    console.log("[upsertClientForQuote] skipped — no name or email provided");
    return null;
  }

  const fullName = name || email!.split("@")[0] || "Cliente";
  const normalizedEmail = email ? normalizeEmail(email) : null;

  console.log("[upsertClientForQuote] normalized", { fullName, normalizedEmail });

  if (normalizedEmail) {
    const { data: byEmail, error: emailLookupError } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", userId)
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (emailLookupError) {
      console.error("[upsertClientForQuote] email lookup error", emailLookupError);
      throw new Error(emailLookupError.message);
    }

    console.log("[upsertClientForQuote] email lookup result", byEmail);

    if (byEmail?.id) {
      const { data: updatedClient, error: updateError } = await supabase
        .from("clients")
        .update({
          full_name: fullName,
          email: normalizedEmail,
        })
        .eq("id", byEmail.id)
        .select("id")
        .single();

      if (updateError) {
        console.error("[upsertClientForQuote] update error", updateError);
        throw new Error(updateError.message);
      }

      console.log("[upsertClientForQuote] updated existing client", updatedClient);
      return byEmail.id as string;
    }
  } else if (name) {
    const { data: byName, error: nameLookupError } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", userId)
      .ilike("full_name", name)
      .maybeSingle();

    if (nameLookupError) {
      console.error("[upsertClientForQuote] name lookup error", nameLookupError);
      throw new Error(nameLookupError.message);
    }

    console.log("[upsertClientForQuote] name lookup result", byName);

    if (byName?.id) {
      console.log("[upsertClientForQuote] matched existing client by name", byName);
      return byName.id as string;
    }
  }

  const { data: insertedClient, error: insertError } = await supabase
    .from("clients")
    .insert({
      user_id: userId,
      full_name: fullName,
      email: normalizedEmail,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[upsertClientForQuote] insert error", insertError);
    throw new Error(insertError.message ?? "Error al guardar el cliente");
  }

  if (!insertedClient) {
    console.error("[upsertClientForQuote] insert returned no data");
    throw new Error("Error al guardar el cliente");
  }

  console.log("[upsertClientForQuote] inserted new client", insertedClient);
  return insertedClient.id as string;
}

export async function saveQuote(
  args: SaveQuoteArgs,
): Promise<SaveQuoteSuccess | SaveQuoteError> {
  console.log("[saveQuote] called with", {
    clientName: args.clientName,
    clientEmail: args.clientEmail,
    hasQuote: !!args.quote,
  });

  try {
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

    const clientId = await upsertClientForQuote(
      supabase,
      userId,
      args.clientName,
      args.clientEmail,
    );

    const { data: insertedQuote, error: quoteInsertError } = await supabase
      .from("quotes")
      .insert({
        user_id: userId,
        agency_id: agency.id,
        agent_id: userId,
        client_id: clientId,
        reference: `${args.quote.id}-${Date.now()}`,
        valid_until: addDaysIso(new Date(), 30),
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
  } catch (err) {
    console.error("[saveQuote] error:", err);
    return {
      ok: false,
      error: (err as Error).message ?? "Error desconocido guardando la cotización",
    };
  }
}

/**
 * ─────────────────────────────────────────────────────────────
 *  loadQuoteForPdf
 * ─────────────────────────────────────────────────────────────
 *
 *  Carga una cotización desde Supabase y la transforma al tipo Quote
 *  que las plantillas consumen.
 *
 *  ⚠️  ESTE ARCHIVO REQUIERE ADAPTACIÓN AL ESQUEMA REAL DE TQUOT.
 *
 *  El esquema de tu Supabase (tablas `quotes`, `quote_line_items`, `agencies`,
 *  `clients`, etc.) probablemente difiere en nombres de columnas. Adapta los
 *  selects y el mapper sin tocar las plantillas.
 *
 *  Lo que importa: que la función devuelva un objeto que cumpla `Quote` en
 *  `lib/pdf/types.ts`. Si tu modelo no tiene un campo, devuélvelo como null
 *  o con un valor por defecto sensato.
 */

import { createClient } from "@supabase/supabase-js";
import type { Quote, QuoteLineItem } from "../types";
import type { PriceSource } from "../theme";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars no configuradas");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─────────────────────────────────────────────────────────────
// Mapper de fuente
// ─────────────────────────────────────────────────────────────

function mapSource(raw: string | null | undefined): PriceSource {
  if (!raw) return "WEB";
  const normalized = raw.toUpperCase().replace(/[-_\s]/g, "_");
  if (normalized.includes("PROPIO") || normalized.includes("INV")) return "INV_PROPIO";
  if (normalized.includes("CORPORAT")) return "CORPORATIVO";
  return "WEB";
}

type QuoteLineItemRow = {
  id: string;
  category: QuoteLineItem["category"];
  description: string;
  subtitle?: string | null;
  net_cost?: number | string | null;
  margin?: number | string | null;
  margin_percent?: number | string | null;
  public_price?: number | string | null;
  source?: string | null;
  internal_notes?: string | null;
  supplier?: string | null;
  per_person?: boolean | null;
  pax_count?: number | string | null;
};

// ─────────────────────────────────────────────────────────────
// Carga principal
// ─────────────────────────────────────────────────────────────

export async function loadQuoteForPdf(quoteId: string): Promise<Quote | null> {
  const supabase = supabaseAdmin();

  // TODO[INTEGRACION]: ajustar los nombres de columnas a los reales de TQuot.
  // Este select asume nombres convencionales. Si tienes joins distintos o
  // tablas con otros nombres, modifica esta query.
  const { data, error } = await supabase
    .from("quotes")
    .select(
      `
      *,
      agency:agencies (*),
      agent:users!quotes_agent_id_fkey (full_name, email),
      client:clients (*),
      line_items:quote_line_items (*)
      `
    )
    .eq("id", quoteId)
    .single();

  if (error || !data) {
    console.error("[loadQuoteForPdf] error o no encontrada:", error);
    return null;
  }

  // ─── Mapeo a Quote ───
  // Renombra los campos según tu esquema real. Esto es solo una plantilla.

  const lineItems: QuoteLineItem[] = ((data.line_items ?? []) as QuoteLineItemRow[]).map((li) => ({
    id: li.id,
    category: li.category,
    description: li.description,
    subtitle: li.subtitle ?? null,
    netCost: Number(li.net_cost ?? 0),
    margin: Number(li.margin ?? 0),
    marginPercent: Number(li.margin_percent ?? 0),
    publicPrice: Number(li.public_price ?? 0),
    source: mapSource(li.source),
    internalNotes: li.internal_notes ?? null,
    supplier: li.supplier ?? null,
    perPerson: Boolean(li.per_person ?? false),
    paxCount: Number(li.pax_count ?? 1),
  }));

  const quote: Quote = {
    id: data.id,
    reference: data.reference,
    createdAt: data.created_at,
    validUntil: data.valid_until,

    agency: {
      id: data.agency.id,
      name: data.agency.name,
      logoUrl: data.agency.logo_url ?? null,
      legalName: data.agency.legal_name ?? data.agency.name,
      taxId: data.agency.tax_id ?? "",
      address: data.agency.address ?? "",
      phone: data.agency.phone ?? "",
      email: data.agency.email ?? "",
      website: data.agency.website ?? null,
      legalDisclaimer: data.agency.legal_disclaimer ?? null,
    },

    agent: {
      name: data.agent?.full_name ?? "",
      email: data.agent?.email ?? "",
    },

    client: {
      fullName: data.client?.full_name ?? "",
      email: data.client?.email ?? null,
      phone: data.client?.phone ?? null,
      reference: data.client?.reference ?? null,
    },

    trip: {
      origin: data.origin,
      destination: data.destination,
      departureDate: data.departure_date,
      returnDate: data.return_date,
      nights: Number(data.nights ?? 0),
      adults: Number(data.adults ?? 0),
      children: Number(data.children ?? 0),
      infants: Number(data.infants ?? 0),
      purpose: data.purpose ?? "",
    },

    lineItems,

    totals: {
      netCost: Number(data.total_net_cost ?? 0),
      margin: Number(data.total_margin ?? 0),
      marginPercent: Number(data.total_margin_percent ?? 0),
      publicPrice: Number(data.total_public_price ?? 0),
      currency: (data.currency ?? "EUR") as "EUR" | "USD" | "GBP",
    },

    agentNotes: data.agent_notes ?? null,
    clientMessage: data.client_message ?? null,
    paymentTerms: data.payment_terms ?? null,
    cancellationPolicy: data.cancellation_policy ?? null,
  };

  return quote;
}

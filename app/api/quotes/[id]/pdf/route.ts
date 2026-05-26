/**
 * ─────────────────────────────────────────────────────────────
 *  GET /api/quotes/[id]/pdf?variant=agent|client&inline=1
 * ─────────────────────────────────────────────────────────────
 *
 *  Descarga directa de PDF. Útil para botones tipo:
 *    <a href={`/api/quotes/${id}/pdf?variant=client`} target="_blank">Ver PDF</a>
 *
 *  Query params:
 *  - variant: "agent" | "client"  (obligatorio)
 *  - inline:  "1" para mostrar en navegador, ausente para descargar.
 */

import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/app/api/parser/_auth";
import { renderQuotePdf, pdfResponse } from "@/lib/pdf/render";
import { loadQuoteForPdf } from "@/lib/pdf/utils/load-quote";
import type { PdfVariant } from "@/lib/pdf/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs"; // @react-pdf/renderer no es compatible con edge runtime

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const variantParam = url.searchParams.get("variant");
    const inline = url.searchParams.get("inline") === "1";

    if (variantParam !== "agent" && variantParam !== "client") {
      return new Response(
        JSON.stringify({ error: "variant debe ser 'agent' o 'client'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const variant: PdfVariant = variantParam;

    const auth = await getAuthenticatedUser();
    if (auth.response) return auth.response;

    const supabase = await createServerSupabaseClient();
    const { data: quoteRow, error: quoteError } = await supabase
      .from("quotes")
      .select("user_id")
      .eq("id", id)
      .single();

    if (quoteError || !quoteRow) {
      return new Response(JSON.stringify({ error: "Cotización no encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (quoteRow.user_id !== auth.user.id) {
      return new Response(JSON.stringify({ error: "Sin permisos" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const quote = await loadQuoteForPdf(id);
    if (!quote) {
      return new Response(JSON.stringify({ error: "Cotización no encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const buffer = await renderQuotePdf(quote, variant);
    const filename =
      variant === "agent"
        ? `${quote.reference}-interna.pdf`
        : `${quote.reference}-propuesta.pdf`;

    return pdfResponse(buffer, filename, { inline });
  } catch (err) {
    console.error("[GET /api/quotes/[id]/pdf] error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

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
import { renderQuotePdf, pdfResponse } from "@/lib/pdf/render";
import { loadQuoteForPdf } from "@/lib/pdf/utils/load-quote";
import type { PdfVariant } from "@/lib/pdf/types";

// TODO[INTEGRACION]: importar helpers de auth de tu proyecto
// import { getSessionFromRequest } from "@/lib/auth";
// import { canAccessQuote } from "@/lib/permissions";

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

    // TODO[INTEGRACION]: validar sesión y permisos
    // const user = await getSessionFromRequest(req);
    // if (!user) return new Response("No autenticado", { status: 401 });
    // const allowed = await canAccessQuote(user, id);
    // if (!allowed) return new Response("Sin permisos", { status: 403 });
    //
    // SEGURIDAD: en variant=agent, validar también que el usuario pertenece
    // a la agencia que emite la cotización. Un cliente con acceso al recurso
    // NUNCA debe poder ver el PDF interno con márgenes y costes.

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

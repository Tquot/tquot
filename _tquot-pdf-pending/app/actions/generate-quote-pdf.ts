"use server";

/**
 * ─────────────────────────────────────────────────────────────
 *  Server Action: generateQuotePdf
 * ─────────────────────────────────────────────────────────────
 *
 *  Punto de entrada desde la UI. Resuelve permisos, carga la cotización
 *  desde Supabase, renderiza el PDF y devuelve el Buffer en base64 para
 *  que el cliente lo descargue.
 *
 *  Para descargas directas en URL preferir el route handler
 *  /api/quotes/[id]/pdf?variant=agent|client.
 */

import { renderQuotePdf } from "@/lib/pdf/render";
import { loadQuoteForPdf } from "@/lib/pdf/utils/load-quote";
import type { PdfVariant } from "@/lib/pdf/types";

// TODO[INTEGRACION]: importar el helper de auth/permisos que ya usas en TQuot.
// Ejemplo asumido:
//   import { getCurrentUser } from "@/lib/auth";
//   import { canAccessQuote } from "@/lib/permissions";

interface GeneratePdfArgs {
  quoteId: string;
  variant: PdfVariant;
}

interface GeneratePdfSuccess {
  ok: true;
  filename: string;
  contentType: "application/pdf";
  base64: string;
}

interface GeneratePdfError {
  ok: false;
  error: string;
}

export async function generateQuotePdf(
  args: GeneratePdfArgs
): Promise<GeneratePdfSuccess | GeneratePdfError> {
  try {
    // TODO[INTEGRACION]: autenticación y permisos
    // const user = await getCurrentUser();
    // if (!user) return { ok: false, error: "No autenticado" };
    // const allowed = await canAccessQuote(user, args.quoteId);
    // if (!allowed) return { ok: false, error: "Sin permisos para esta cotización" };

    // Si la variante es 'agent', el usuario debe pertenecer a la agencia que emite.
    // Si es 'client', basta con tener acceso a la cotización.

    const quote = await loadQuoteForPdf(args.quoteId);
    if (!quote) return { ok: false, error: "Cotización no encontrada" };

    const buffer = await renderQuotePdf(quote, args.variant);

    const filename =
      args.variant === "agent"
        ? `${quote.reference}-interna.pdf`
        : `${quote.reference}-propuesta.pdf`;

    return {
      ok: true,
      filename,
      contentType: "application/pdf",
      base64: buffer.toString("base64"),
    };
  } catch (err) {
    console.error("[generateQuotePdf] error:", err);
    return {
      ok: false,
      error: (err as Error).message ?? "Error desconocido generando el PDF",
    };
  }
}

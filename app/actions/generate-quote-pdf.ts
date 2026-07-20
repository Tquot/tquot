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

import { getAuthenticatedUser } from "@/app/api/parser/_auth";
import { generateQuotePDF } from "@/lib/pdf/generate";
import type { PdfVariant } from "@/lib/pdf/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
    const auth = await getAuthenticatedUser();
    if (auth.response) {
      return { ok: false, error: "No autenticado" };
    }

    const supabase = await createServerSupabaseClient();
    const { data: quoteRow, error: quoteError } = await supabase
      .from("quotes")
      .select("user_id")
      .eq("id", args.quoteId)
      .single();

    if (quoteError || !quoteRow) {
      return { ok: false, error: "Cotización no encontrada" };
    }

    if (quoteRow.user_id !== auth.user.id) {
      return { ok: false, error: "Sin permisos para esta cotización" };
    }

    const buffer = await generateQuotePDF({
      quoteId: args.quoteId,
      variant: args.variant,
    });

    const { data: refRow } = await supabase
      .from("quotes")
      .select("reference")
      .eq("id", args.quoteId)
      .single();
    const reference = refRow?.reference ?? args.quoteId;

    const filename =
      args.variant === "agent"
        ? `${reference}-interna.pdf`
        : `${reference}-propuesta.pdf`;

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

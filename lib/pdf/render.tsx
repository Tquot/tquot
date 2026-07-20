/**
 * Punto de entrada para generar PDFs.
 *
 * renderQuotePdf(quote, variant) → Buffer listo para servir/guardar.
 *
 * Importa las plantillas dinámicamente porque @react-pdf/renderer pesa y
 * solo lo cargamos cuando hace falta (mejor cold-start en Vercel).
 */

import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { registerFonts } from "./fonts";
import { AgentPDF } from "./templates/AgentPDF";
import { ClientPDF } from "./templates/ClientPDF";
import type { Quote, PdfVariant } from "./types";

export async function renderQuotePdf(
  quote: Quote,
  variant: PdfVariant
): Promise<Buffer> {
  registerFonts();

  const element =
    variant === "agent" ? <AgentPDF quote={quote} /> : <ClientPDF quote={quote} />;

  return await renderToBuffer(element);
}

export { generateQuotePDF } from "./generate";
export type { GenerateQuotePdfInput } from "./generate";

/**
 * Helper para devolver el PDF como Response de Next.js.
 */
export function pdfResponse(
  buffer: Buffer,
  filename: string,
  options: { inline?: boolean } = {}
): Response {
  const disposition = options.inline ? "inline" : "attachment";
  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(filename)}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}

import { z } from "zod";
import { client, CLAUDE_MODEL } from "./anthropic-client";
import { sanitize } from "./sanitize";
import { preExtract, type Hints } from "./pre-extract";
import { shouldCallModel } from "./should-call-model";
import {
  applyDefaults,
  type Assumption,
  type BlockingField,
} from "./defaults";
import { merge, type ModelParseOutput } from "./merge-hints";
import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";

const ParsedSchema = z.object({
  legs: z
    .array(
      z.object({
        origin: z.string().nullable(),
        destination: z.string(),
        arrivalDate: z.string().nullable(),
        departureDate: z.string().nullable(),
        nights: z.number().int().positive().nullable(),
        preferences: z.object({
          hotelCategory: z.number().int().min(1).max(5).nullable(),
          area: z.string().nullable(),
          boardCode: z.enum(["SA", "AD", "MP", "PC", "TI"]).nullable(),
          beachfront: z.boolean().nullable(),
        }),
      }),
    )
    .min(1),
  travelers: z.object({
    adults: z.number().int().positive(),
    children: z.array(
      z.object({ age: z.number().int().min(0).max(17) }),
    ),
  }),
  budget: z
    .object({
      amount: z.number().positive(),
      currency: z.string().length(3),
      per: z.enum(["person", "total"]),
    })
    .nullable(),
  tags: z.array(z.string()),
  uncertain: z.record(z.string(), z.string()),
});

const SYSTEM = `Extraes datos de viaje de mensajes informales de clientes finales españoles, escritos por WhatsApp o email. El destinatario es un agente de viajes profesional.

Reglas:
- Devuelves SOLO JSON válido. Sin markdown, sin explicación, sin backticks.
- Si un dato no está en el mensaje, pon null. NO lo inventes.
- Si dudas de un dato que sí has puesto, añádelo a "uncertain" con el motivo en una frase corta.
- Recibirás HINTS extraídos con reglas. Son fiables: úsalos salvo que el texto los contradiga claramente. Si los contradices, explica por qué en "uncertain".
- "5 días" en boca de un cliente significa 4 noches. "una semana" son 7 noches.
- Si el mensaje es una conversación con varios turnos, el cliente es quien pide y el agente quien responde. Extrae lo que pide el cliente y lo que el agente haya confirmado.
- Si el cliente cambia de idea a lo largo de la conversación, vale la última versión.
- Multi-destino: un leg por ciudad, en orden cronológico. El origen de cada leg es el destino del anterior.
- Nunca inventes presupuesto. Si no lo dice, budget es null.
- Nunca inventes el origen. Si no lo dice, origin es null.`;

export interface ParseInformalResult {
  parsed: ParsedTripInputV2;
  hints: Hints;
  usedModel: boolean;
  assumptions: Assumption[];
  blocking: BlockingField[];
  /** Mensaje original sin tocar (sanitize es destructivo). */
  sourceMessage: string;
  channel: "whatsapp" | "email" | "plain";
}

export async function parseInformal(
  raw: string,
  ctx: { agencyDefaultOrigin: string; agencyId?: string },
): Promise<ParseInformalResult> {
  const sourceMessage = raw;
  const { clean, channel, turns } = sanitize(raw);
  const hints = preExtract(clean);

  let modelOutput: ModelParseOutput | null = null;

  if (shouldCallModel(hints, clean)) {
    modelOutput = await callModel(clean, hints, channel, turns.length);
  }

  const merged = merge(hints, modelOutput, sourceMessage);

  const { parsed, assumptions, blocking } = applyDefaults(merged, {
    defaultOrigin: ctx.agencyDefaultOrigin,
    flags: hints.flags,
  });

  return {
    parsed,
    hints,
    usedModel: modelOutput !== null,
    assumptions,
    blocking,
    sourceMessage,
    channel,
  };
}

async function callModel(
  clean: string,
  hints: Hints,
  channel: string,
  turnCount: number,
): Promise<ModelParseOutput | null> {
  const hintBlock = JSON.stringify(hints);

  try {
    const res = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `CANAL: ${channel}${turnCount > 1 ? ` (${turnCount} mensajes)` : ""}

HINTS (extraídos con reglas, fiables):
${hintBlock}

MENSAJE:
${clean}`,
        },
      ],
    });

    const text =
      res.content.find((c) => c.type === "text")?.text ?? "";
    const jsonText = text.replace(/```json\n?|```/g, "").trim();

    try {
      return ParsedSchema.parse(JSON.parse(jsonText));
    } catch {
      // Si el modelo devuelve algo inválido, seguimos solo con hints.
      return null;
    }
  } catch {
    return null;
  }
}

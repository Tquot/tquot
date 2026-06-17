import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { NARRATOR_MODEL } from "./prompts";
import type { RefinementIntent } from "@/lib/quote-conversation/types";

const RefinementIntentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("change_hotel"),
    criteria: z
      .string()
      .describe(
        "Criterio del cambio: más barato, más céntrico, con piscina, etc.",
      ),
  }),
  z.object({
    kind: z.literal("change_flight"),
    criteria: z
      .string()
      .describe("Criterio del cambio: directo, otra aerolínea, otra hora, etc."),
  }),
  z.object({
    kind: z.literal("change_dates"),
    newCheckIn: z
      .string()
      .optional()
      .describe("Nueva fecha de entrada en formato YYYY-MM-DD"),
    newCheckOut: z
      .string()
      .optional()
      .describe("Nueva fecha de salida en formato YYYY-MM-DD"),
  }),
  z.object({
    kind: z.literal("add_service"),
    service: z
      .string()
      .describe("Servicio a añadir: seguro, transfer, experiencia X, etc."),
  }),
  z.object({
    kind: z.literal("remove_service"),
    service: z
      .string()
      .describe("Servicio a quitar: transfer, experiencia, hotel, vuelo, etc."),
  }),
  z.object({
    kind: z.literal("change_pax"),
    adults: z.number().int().optional(),
    children: z.number().int().optional(),
  }),
  z.object({
    kind: z.literal("change_budget"),
    tier: z.enum(["budget", "mid", "premium", "luxury"]).optional(),
    amount: z.number().positive().optional(),
  }),
  z.object({
    kind: z.literal("free_text"),
    text: z
      .string()
      .describe(
        "Texto literal del agente; usar cuando no encaja en ninguna otra categoría.",
      ),
  }),
]);

const SYSTEM = `Clasifica el siguiente texto del agente de viajes en una intención de refinamiento de la cotización.
El agente puede pedir cambios en hotel, vuelo, fechas, número de pasajeros, presupuesto, o añadir/quitar servicios.
Si el mensaje no es un cambio (saludo, agradecimiento, pregunta, comentario), usa kind: "free_text" con el texto original.

Ejemplos:
- "cambia el hotel por algo más barato" → { kind: "change_hotel", criteria: "más barato" }
- "quita el transfer" → { kind: "remove_service", service: "transfer" }
- "añade seguro de viaje" → { kind: "add_service", service: "seguro de viaje" }
- "muévelo al 20 de marzo" → { kind: "change_dates", newCheckIn: "2026-03-20" }
- "gracias" → { kind: "free_text", text: "gracias" }
- "¿cuánto cuesta el upgrade?" → { kind: "free_text", text: "¿cuánto cuesta el upgrade?" }`;

interface ClassifyContext {
  destination: string;
  checkIn?: string;
  checkOut?: string;
}

export async function classifyRefinementIntent(
  userInput: string,
  context: ClassifyContext,
): Promise<RefinementIntent> {
  try {
    const { object } = await generateObject({
      model: anthropic(NARRATOR_MODEL),
      schema: RefinementIntentSchema,
      system: SYSTEM,
      prompt: [
        `Quote actual: ${context.destination}, ${context.checkIn ?? "?"} → ${context.checkOut ?? "?"}.`,
        `Mensaje del agente: "${userInput}"`,
      ].join("\n"),
      temperature: 0,
    });
    return object as RefinementIntent;
  } catch {
    return { kind: "free_text", text: userInput };
  }
}

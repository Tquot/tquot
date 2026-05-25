import { callStructured } from "@/lib/parser/anthropic-client";
import type { HotelLevel, ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import { REFINE_SYSTEM_PROMPT } from "@/lib/quotes/refine/prompts";
import { RefineActionSchema } from "@/lib/quotes/refine/schema";
import { buildRefineUserMessage } from "@/lib/quotes/refine/summarize";
import type { RefineAction } from "@/lib/quotes/refine/types";

function inferHotelLevelFromText(text: string): HotelLevel | undefined {
  const lower = text.toLowerCase();
  if (
    /\b(5\s*estrellas?|cinco estrellas?|5\s*★|five\s*star|luxury|lujo|lujoso)\b/i.test(
      lower,
    )
  ) {
    return "luxury";
  }
  if (/\b(4\s*estrellas?|cuatro estrellas?|premium|superior)\b/i.test(lower)) {
    return "premium";
  }
  if (/\b(3\s*estrellas?|tres estrellas?|standard|estándar|estandar)\b/i.test(lower)) {
    return "standard";
  }
  if (/\b(budget|económico|economico|barato|low\s*cost)\b/i.test(lower)) {
    return "budget";
  }
  return undefined;
}

function extractHotelArea(message: string): string | undefined {
  const patterns = [
    /\bcerca\s+de\s+(.+?)(?:[,.]|$)/i,
    /\ben\s+(?:la\s+)?zona\s+de\s+(.+?)(?:[,.]|$)/i,
    /\ben\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]{2,40})/,
    /\bplaya\s+([a-záéíóúñ\s]+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    const value = match?.[1]?.trim();
    if (value && value.length >= 3) {
      return value.replace(/\s+/g, " ").slice(0, 80);
    }
  }
  return undefined;
}

function extractHotelPreference(text: string): string | undefined {
  const lower = text.toLowerCase();
  const cues: Array<[RegExp, string]> = [
    [/\bzona\s+tranquil[ao]\b/i, "zona tranquila"],
    [/\bhotel\s+familiar\b|\bfamiliar\b/i, "familiar"],
    [/\badultos\s+only\b|\bsolo\s+adultos\b/i, "adultos"],
    [/\bcentro\b|\bcéntrico\b|\bcentrico\b/i, "centro ciudad"],
    [/\bvista\s+mar\b|\bfrente\s+al\s+mar\b/i, "vista mar"],
    [/\btodo\s+incluido\b|\ball\s+inclusive\b/i, "todo incluido"],
  ];

  for (const [pattern, label] of cues) {
    if (pattern.test(lower)) return label;
  }
  return undefined;
}

function classifyHotelPreferenceHeuristic(message: string): RefineAction | null {
  const lower = message.toLowerCase();
  if (
    !/\b(hotel|alojamiento|alojamientos|accommodation|hospedaje|hospedajes)\b/i.test(
      lower,
    )
  ) {
    return null;
  }

  const level = inferHotelLevelFromText(lower);
  const area = extractHotelArea(message);
  const preference = extractHotelPreference(lower);

  if (!level && !area && !preference) {
    return null;
  }

  return {
    action: "change_hotel_level",
    params: { level, area, preference },
  };
}

export async function classifyRefinementRequest(
  message: string,
  quote: Quote,
  tripInput: ParsedTripInput,
): Promise<RefineAction> {
  const heuristic = classifyHotelPreferenceHeuristic(message);
  if (heuristic) {
    return heuristic;
  }

  try {
    return await callStructured({
      schema: RefineActionSchema,
      system: REFINE_SYSTEM_PROMPT,
      userMessage: buildRefineUserMessage(message, quote, tripInput),
      maxTokens: 1024,
    });
  } catch (error) {
    console.warn("[refine/classify] failed", error);
    return {
      action: "unknown",
      params: {
        text: "No he podido interpretar la solicitud. Prueba a reformularla.",
      },
    };
  }
}

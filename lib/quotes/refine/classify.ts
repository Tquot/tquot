import { callStructured } from "@/lib/parser/anthropic-client";
import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import { REFINE_SYSTEM_PROMPT } from "@/lib/quotes/refine/prompts";
import { RefineActionSchema } from "@/lib/quotes/refine/schema";
import { buildRefineUserMessage } from "@/lib/quotes/refine/summarize";
import type { RefineAction } from "@/lib/quotes/refine/types";

export async function classifyRefinementRequest(
  message: string,
  quote: Quote,
  tripInput: ParsedTripInput,
): Promise<RefineAction> {
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

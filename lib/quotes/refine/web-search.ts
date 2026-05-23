import { client, CLAUDE_MODEL } from "@/lib/parser/anthropic-client";
import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import {
  summarizeQuoteForRefine,
  summarizeTripInputForRefine,
} from "@/lib/quotes/refine/summarize";

export async function searchWebSuggestion(
  query: string,
  quote: Quote,
  tripInput: ParsedTripInput,
): Promise<string> {
  try {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 800,
      system: `Eres un asistente de sourcing para agencias de viajes.
Sugiere DMCs, tour operadores o proveedores locales plausibles para la petición.
Responde en español, en 3-5 frases. Indica que es una sugerencia orientativa (no verificada en vivo).
No modifiques la cotización.`,
      messages: [
        {
          role: "user",
          content: JSON.stringify(
            {
              query,
              trip: summarizeTripInputForRefine(tripInput),
              quote: summarizeQuoteForRefine(quote),
            },
            null,
            2,
          ),
        },
      ],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return (
      text ||
      "No he encontrado una sugerencia concreta. Indica destino y tipo de servicio con más detalle."
    );
  } catch (error) {
    console.warn("[refine/web-search] failed", error);
    return "No he podido generar una sugerencia de proveedor en este momento.";
  }
}

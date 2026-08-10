import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { PROVIDER_SEARCH_SYSTEM, buildProviderSearchMessage } from "./prompt";
import {
  RawSearchResultSchema,
  type RawProvider,
  type ProviderCategory,
} from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface SearchOpts {
  category: ProviderCategory;
  destination: string;
  country: string | null;
  travelers: { adults: number; children: number };
  dates: { from: string; to: string } | null;
  rawRequest: string | null;
}

export interface SearchOutcome {
  providers: RawProvider[];
  noResultsReason: string | null;
  /** Para instrumentar coste. */
  usage: { input: number; output: number; searches: number };
}

export async function searchProviders(o: SearchOpts): Promise<SearchOutcome> {
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: PROVIDER_SEARCH_SYSTEM,
    messages: [{ role: "user", content: buildProviderSearchMessage(o) }],
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        // Dos por operador: uno para encontrarlo, otro para su página de contacto
        max_uses: 6,
      },
    ],
  });

  // El contenido llega mezclado: bloques de texto, de uso de herramienta y de
  // resultado. Nos quedamos con el texto y buscamos el JSON en él.
  const textBlocks = res.content.filter(
    (b): b is Extract<(typeof res.content)[number], { type: "text" }> =>
      b.type === "text",
  );
  const text = textBlocks.map((b) => b.text).join("\n");

  const searches = res.content.filter((b) => b.type === "server_tool_use").length;

  const parsed = extractJson(text);
  if (!parsed) {
    return {
      providers: [],
      noResultsReason: "La búsqueda no devolvió un resultado legible.",
      usage: {
        input: res.usage.input_tokens,
        output: res.usage.output_tokens,
        searches,
      },
    };
  }

  const validated = RawSearchResultSchema.safeParse(parsed);
  if (!validated.success) {
    // Schema roto: no intentamos rescatar campos sueltos. Si el modelo no ha
    // respetado la forma, tampoco confiamos en el contenido.
    return {
      providers: [],
      noResultsReason:
        "El resultado de la búsqueda no superó la validación de formato.",
      usage: {
        input: res.usage.input_tokens,
        output: res.usage.output_tokens,
        searches,
      },
    };
  }

  return {
    providers: validated.data.providers,
    noResultsReason: validated.data.no_results_reason,
    usage: {
      input: res.usage.input_tokens,
      output: res.usage.output_tokens,
      searches,
    },
  };
}

/** El modelo a veces envuelve el JSON en prosa pese a la instrucción. */
function extractJson(text: string): unknown | null {
  const cleaned = text.replace(/```json\n?|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    /* seguimos */
  }

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

import Anthropic from "@anthropic-ai/sdk";
import { z, type ZodTypeAny } from "zod";

if (!process.env["ANTHROPIC_API_KEY"]) {
  console.warn("[tquot-parser] ANTHROPIC_API_KEY no configurada");
}

export const client = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"] || "",
});

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";

const PARSER_TIMEOUT_MS = 15_000;

const JSON_RESPONSE_INSTRUCTION = `Respond with a single valid JSON object only.
Do not include markdown, code fences, or any text before or after the JSON.`;

// ─────────────────────────────────────────────────────────────
// Wrapper: callStructured
//
// Pide JSON en el prompt, lee la respuesta de texto y valida con Zod.
// ─────────────────────────────────────────────────────────────

interface CallStructuredOptions<S extends ZodTypeAny> {
  schema: S;
  system: string;
  userMessage: string;
  maxTokens?: number;
  retries?: number;
}

type ClaudeContentBlock = {
  type?: string;
  text?: string;
};

export async function callStructured<S extends ZodTypeAny>(
  opts: CallStructuredOptions<S>
): Promise<z.infer<S>> {
  const {
    schema,
    system,
    userMessage,
    maxTokens = 2048,
    retries = 2,
  } = opts;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await createMessageWithTimeout({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system: `${system}\n\n${JSON_RESPONSE_INSTRUCTION}`,
        messages: [{ role: "user", content: userMessage }],
      });

      const text = ((
        (response as unknown as Record<string, unknown>).content ?? []
      ) as ClaudeContentBlock[])
        .filter((content) => content.type === "text" && typeof content.text === "string")
        .map((content) => content.text)
        .join("");

      if (!text) throw new Error("Respuesta vacía del modelo");

      const parsed = parseJsonFromText(text);
      return schema.parse(parsed);
    } catch (err) {
      if (err instanceof Error && err.message === "Parser timeout after 15s") {
        throw err;
      }
      lastError = err;
      if (attempt < retries) {
        const delay = 500 * Math.pow(3, attempt);
        await sleep(delay);
        continue;
      }
    }
  }

  throw new Error(
    `callStructured falló tras ${retries + 1} intentos: ${(lastError as Error)?.message ?? "unknown"}`
  );
}

function parseJsonFromText(text: string): unknown {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      return JSON.parse(fenced[1].trim());
    }

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }

    throw new Error("No se encontró JSON válido en la respuesta del modelo");
  }
}

async function createMessageWithTimeout(
  params: Parameters<typeof client.messages.create>[0],
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PARSER_TIMEOUT_MS);

  try {
    return await client.messages.create(params, { signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error("Parser timeout after 15s");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

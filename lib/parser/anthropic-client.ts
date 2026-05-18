import Anthropic from "@anthropic-ai/sdk";
import { z, type ZodTypeAny } from "zod";

if (!process.env.ANTHROPIC_API_KEY) {
  // No tiramos aquí para permitir importar el módulo en build; sí en runtime.
  console.warn("[tquot-parser] ANTHROPIC_API_KEY no configurada");
}

export const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";

// ─────────────────────────────────────────────────────────────
// Wrapper: callStructured
//
// Llama a la API con Structured Outputs (output_config.format),
// extrae el texto, lo parsea y valida con Zod.
//
// NOTA SDK: la versión instalada tipa `output_config`, así que no necesitamos
// cast sobre `messages.create`.
// Docs: https://docs.claude.com/en/docs/build-with-claude/structured-outputs
// ─────────────────────────────────────────────────────────────

interface CallStructuredOptions<S extends ZodTypeAny> {
  schema: S;
  system: string;
  userMessage: string;
  maxTokens?: number;
  retries?: number;
}

type JsonSchemaValue =
  | string
  | number
  | boolean
  | null
  | JsonSchemaValue[]
  | { [key: string]: JsonSchemaValue };

type ClaudeContentBlock = {
  type?: string;
  text?: string;
};

const UNSUPPORTED_NUMERIC_BOUNDS = new Set([
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
]);

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

  // Convertir Zod a JSON Schema. Zod v3.23+ trae z.toJSONSchema en el namespace.
  // Si no estuviera disponible, usar el helper externo `zod-to-json-schema`.
  const rawJsonSchema =
    (z as unknown as { toJSONSchema?: (s: ZodTypeAny) => object }).toJSONSchema?.(schema) ??
    zodToJsonSchemaFallback();
  const jsonSchema = stripUnsupportedNumericBounds(rawJsonSchema);

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userMessage }],
        output_config: {
          format: { type: "json_schema", schema: jsonSchema as Record<string, unknown> },
        },
      });

      const text = ((response.content ?? []) as ClaudeContentBlock[])
        .filter((content) => content.type === "text" && typeof content.text === "string")
        .map((content) => content.text)
        .join("");

      if (!text) throw new Error("Respuesta vacía del modelo");

      const parsed = JSON.parse(text);
      return schema.parse(parsed);
    } catch (err) {
      lastError = err;
      // Reintento con backoff exponencial: 500ms, 1500ms
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripUnsupportedNumericBounds(value: unknown): JsonSchemaValue {
  if (Array.isArray(value)) {
    return value.map(stripUnsupportedNumericBounds);
  }

  if (!value || typeof value !== "object") {
    return value as JsonSchemaValue;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !UNSUPPORTED_NUMERIC_BOUNDS.has(key))
      .map(([key, nestedValue]) => [key, stripUnsupportedNumericBounds(nestedValue)]),
  );
}

// Fallback mínimo si el SDK de Zod no expone toJSONSchema en la versión instalada.
// En ese caso, mejor instalar `zod-to-json-schema` e importarlo aquí.
function zodToJsonSchemaFallback(): object {
  throw new Error(
    "z.toJSONSchema no disponible en esta versión de zod. " +
      "Actualizar a zod >= 3.23 o instalar `zod-to-json-schema` y adaptar este helper."
  );
}

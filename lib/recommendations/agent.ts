import Anthropic from "@anthropic-ai/sdk";
import type { ServiceCatalogEntry } from "./catalog";
import { AgentResponseSchema, type AgentResponse } from "./types";
import {
  RECOMMENDATIONS_MODEL,
  MAX_WEB_SEARCH_USES,
  buildSystemPrompt,
  buildUserPrompt,
} from "./prompts";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface AgentInput {
  entry: ServiceCatalogEntry;
  destination: string;
  tripContext: string;
  signal?: AbortSignal;
}

export async function runRecommendationAgent(
  input: AgentInput,
): Promise<AgentResponse> {
  const response = await client.messages.create(
    {
      model: RECOMMENDATIONS_MODEL,
      max_tokens: 2048,
      system: buildSystemPrompt(input.entry),
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: MAX_WEB_SEARCH_USES,
        },
      ],
      messages: [
        {
          role: "user",
          content: buildUserPrompt({
            destination: input.destination,
            category: input.entry.label,
            tripContext: input.tripContext,
          }),
        },
      ],
    },
    {
      signal: input.signal,
    },
  );

  const textBlocks = response.content.filter(
    (block): block is Extract<typeof block, { type: "text" }> =>
      block.type === "text",
  );
  const finalText = textBlocks[textBlocks.length - 1]?.text;
  if (!finalText) {
    throw new Error("agent_no_text_response");
  }

  const cleaned = stripCodeFences(finalText).trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`agent_invalid_json: ${(err as Error).message}`);
  }

  const validated = AgentResponseSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `agent_schema_validation_failed: ${JSON.stringify(validated.error.flatten())}`,
    );
  }
  return validated.data;
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

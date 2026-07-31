import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import type { AgentMessage } from "./types";
import { mkMessage, mkSuggestionMessage } from "./message";
import { tplAck, tplBlocker, tplCloseWithNote, tplNoResults } from "./templates";
import { collectSuggestions } from "./suggestions/rank";
import type { SuggestionContext } from "./suggestions/types";
import { extractCloseFacts } from "./facts";
import { narrateClose } from "./narrate";
import { buildProbeIfNeeded } from "./probe";

export type PipelineEvent =
  | { type: "parsed"; parsed: ParsedTripInputV2 }
  | {
      type: "section_done";
      section: string;
      resultsCount: number;
      provider?: string;
    }
  | {
      type: "section_error";
      section: string;
      provider: string;
      retryable: boolean;
    }
  | { type: "section_empty"; section: string; hint?: string | null }
  | { type: "complete" };

interface PlanInput {
  event: PipelineEvent;
  ctx: SuggestionContext;
  /** Mensajes ya emitidos en este build, para no repetirse */
  emitted: AgentMessage[];
}

function availableProviders(ctx: SuggestionContext): string[] {
  const names = new Set<string>();
  for (const h of ctx.candidates.hotels) {
    if (h.provider === "own") names.add("tu inventario");
    else if (h.provider === "booking") names.add("Booking");
    else if (h.provider === "hotelbeds") names.add("Hotelbeds");
  }
  return [...names];
}

export async function planMessage(input: PlanInput): Promise<AgentMessage[]> {
  const { event, ctx, emitted } = input;

  switch (event.type) {
    case "parsed": {
      const probe = buildProbeIfNeeded(event.parsed);
      if (probe) return [probe];
      return [mkMessage("ack", tplAck(event.parsed))];
    }

    case "section_done": {
      // Por defecto: SILENCIO. El BuildProgress ya lo muestra.
      const { interrupting } = collectSuggestions(ctx);
      const fresh = interrupting.filter(
        (s) => !emitted.some((m) => m.suggestionId === s.id),
      );
      return fresh.map(mkSuggestionMessage);
    }

    case "section_error": {
      const available = availableProviders(ctx);
      return [
        mkMessage(
          "blocker",
          tplBlocker(event.provider, available, event.retryable),
        ),
      ];
    }

    case "section_empty":
      return [
        mkMessage(
          "blocker",
          tplNoResults(event.section, event.hint ?? null),
        ),
      ];

    case "complete": {
      const facts = extractCloseFacts(ctx);
      const text =
        facts.notes.length >= 2
          ? await narrateClose(facts)
          : tplCloseWithNote(facts);

      const { afterClose } = collectSuggestions(ctx);
      const fresh = afterClose.filter(
        (s) => !emitted.some((m) => m.suggestionId === s.id),
      );

      return [mkMessage("close", text), ...fresh.map(mkSuggestionMessage)];
    }

    default:
      return [];
  }
}

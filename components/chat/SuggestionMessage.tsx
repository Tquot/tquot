"use client";

import { useTransition } from "react";
import { useQuoteConversationStore } from "@/lib/quote-conversation/store";
import type { Suggestion } from "@/lib/agent/suggestions/types";
import type { QuotePatch } from "@/lib/agent/types";
import { cn } from "@/lib/utils";

export function SuggestionMessage({ suggestion }: { suggestion: Suggestion }) {
  const applyAgentPatch = useQuoteConversationStore((s) => s.applyAgentPatch);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2 animate-slide-up-fade">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-eyebrow text-umber">TQUOT</span>
        {suggestion.priority === 1 && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-warning">
            Revisa
          </span>
        )}
      </div>

      <p className="max-w-[90%] text-body leading-relaxed text-text">
        {suggestion.text}
      </p>

      <div className="flex items-center gap-2 pt-1">
        {suggestion.actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                // Best-effort: if the user accepts a comparator-driven choice,
                // persist comparator_runs so the analytics savings metric can be honest.
                if (
                  suggestion.analytics?.comparatorRun &&
                  action.patch.type === "switchProvider"
                ) {
                  void fetch("/api/analytics/track-comparator-run", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(
                      suggestion.analytics.comparatorRun,
                    ),
                  }).catch(() => {
                    // analytics is best-effort; never block the conversation
                  });
                }

                void applyAgentPatch(action.patch as QuotePatch);
              })
            }
            className={cn(
              "inline-flex h-7 items-center rounded-full px-3 text-body-sm font-medium transition-colors duration-140 disabled:opacity-50",
              action.variant === "primary"
                ? "bg-ink text-paper hover:bg-ink-2"
                : "bg-paper-2 text-text-2 hover:bg-paper-3 hover:text-text",
            )}
          >
            {action.label}
          </button>
        ))}
        {suggestion.delta != null && (
          <span
            className={cn(
              "ml-1 font-mono text-mono-sm tabular-nums",
              suggestion.delta < 0 ? "text-success" : "text-text-2",
            )}
          >
            {suggestion.delta > 0 ? "+" : ""}
            {Math.round(suggestion.delta).toLocaleString("es-ES")} €
          </span>
        )}
      </div>
    </div>
  );
}

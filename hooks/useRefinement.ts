"use client";

import { useEffect, useRef } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { applyClientRefinement } from "@/lib/quote-engine/refine-client";
import { persistRefinementSnapshot } from "@/lib/quote-engine/apply-refinement";
import { useQuoteConversationStore } from "@/lib/quote-conversation/store";
import { isServerRefinementAction } from "@/lib/quotes/refine/utils";
import type { RefineApplyResult } from "@/lib/quotes/refine/types";

async function resolveAgentId(): Promise<string> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? "test-agent";
}

export function useRefinement() {
  const state = useQuoteConversationStore((store) => store.state);
  const dispatch = useQuoteConversationStore((store) => store.dispatch);
  const addAssistantMessage = useQuoteConversationStore(
    (store) => store.addAssistantMessage,
  );
  const addSystemEvent = useQuoteConversationStore((store) => store.addSystemEvent);
  const persistedQuoteId = useQuoteConversationStore(
    (store) => store.persistedQuoteId,
  );
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (state.status !== "refining") {
      appliedRef.current = null;
      return;
    }

    const operationId = state.operationId;
    if (appliedRef.current === operationId) return;
    appliedRef.current = operationId;

    const { quote, parsed, operation } = state;
    const quoteId = persistedQuoteId;

    void (async () => {
      try {
        const agentId = await resolveAgentId();
        const refineAction = operation;

        let responseText = "He actualizado la cotización.";
        let nextQuote = quote;
        let nextTripInput = parsed;

        if (
          refineAction.action === "explain" ||
          refineAction.action === "unknown"
        ) {
          responseText = refineAction.params.text;
        } else if (
          refineAction.action === "cheaper" ||
          refineAction.action === "filter_direct_flights"
        ) {
          const clientResult = applyClientRefinement(
            { message: "" },
            quote,
            parsed,
            refineAction,
          );
          if (clientResult) {
            nextQuote = clientResult.quote;
            nextTripInput = clientResult.tripInput ?? parsed;
            responseText = clientResult.message;
          }
        } else if (isServerRefinementAction(refineAction)) {
          const applyResponse = await fetch("/api/quote/refine/apply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: refineAction,
              currentQuote: quote,
              tripInput: parsed,
              agentId,
            }),
          });

          const applyData = (await applyResponse.json()) as RefineApplyResult & {
            error?: string;
          };

          if (!applyResponse.ok) {
            throw new Error(applyData.error ?? "Apply refinement failed");
          }

          const clientResult = applyClientRefinement(
            applyData,
            quote,
            parsed,
            refineAction,
          );

          if (clientResult) {
            nextQuote = clientResult.quote;
            nextTripInput = clientResult.tripInput ?? parsed;
            responseText = clientResult.suggestion
              ? `${clientResult.message}\n\n${clientResult.suggestion}`
              : clientResult.message;
          } else {
            responseText = applyData.suggestion
              ? `${applyData.message}\n\n${applyData.suggestion}`
              : applyData.message;
          }
        }

        if (
          quoteId &&
          nextQuote !== quote &&
          refineAction.action !== "explain" &&
          refineAction.action !== "unknown" &&
          refineAction.action !== "search_web"
        ) {
          try {
            await persistRefinementSnapshot({
              quoteId,
              previousSnapshot: quote,
              newSnapshot: nextQuote,
              operation: refineAction,
            });
          } catch (persistError) {
            console.error("[useRefinement] persist version failed:", persistError);
          }
        }

        dispatch({
          type: "REFINE_COMPLETE",
          quote: nextQuote,
          operationId,
          parsed: nextTripInput,
        });
        addSystemEvent("refinement-applied", { action: refineAction.action });
        addAssistantMessage(responseText);
      } catch (error) {
        dispatch({
          type: "REFINE_ERROR",
          error: {
            phase: "refining",
            message: error instanceof Error ? error.message : "refine_failed",
            recoverable: true,
            cause: error,
          },
          operationId,
        });
        addAssistantMessage(
          error instanceof Error ? error.message : "refine_failed",
        );
        addSystemEvent("error", {
          message: error instanceof Error ? error.message : "refine_failed",
        });
      }
    })();
  }, [state, dispatch, addAssistantMessage, addSystemEvent, persistedQuoteId]);
}

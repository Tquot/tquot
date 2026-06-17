"use client";

import { useState, useRef } from "react";
import { useQuoteConversationStore } from "@/lib/quote-conversation/store";
import type { ConversationStreamEvent } from "@/lib/quote-conversation/types";
import type { Quote, ParsedTripInput } from "@/lib/quotes/build-quote";

export function useRefinementPlan() {
  const dispatch = useQuoteConversationStore((store) => store.dispatch);
  const addAssistantMessage = useQuoteConversationStore(
    (store) => store.addAssistantMessage,
  );
  const appendToAssistantMessage = useQuoteConversationStore(
    (store) => store.appendToAssistantMessage,
  );
  const finalizeAssistantMessage = useQuoteConversationStore(
    (store) => store.finalizeAssistantMessage,
  );
  const [pending, setPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const requestPlan = async (
    quote: Quote,
    parsed: ParsedTripInput,
    userInput: string,
  ) => {
    dispatch({ type: "USER_REFINE_INPUT", userInput });
    setPending(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const streamingMap = new Map<string, string>();

    try {
      const response = await fetch("/api/quotes/refine/plan/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote, parsed, userInput }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        dispatch({
          type: "REFINE_PLAN_ERROR",
          error: {
            phase: "planning_refinement",
            message: `http_${response.status}`,
            recoverable: true,
          },
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const raw of parts) {
          const dataLine = raw.split("\n").find((line) => line.startsWith("data:"));
          if (!dataLine) continue;
          const json = dataLine.slice(5).trim();
          if (!json) continue;

          let event: ConversationStreamEvent;
          try {
            event = JSON.parse(json) as ConversationStreamEvent;
          } catch {
            continue;
          }

          if (event.type === "narrator.message.start") {
            const clientId = addAssistantMessage("", { streaming: true });
            streamingMap.set(event.messageId, clientId);
          }
          if (event.type === "narrator.message.delta") {
            const clientId = streamingMap.get(event.messageId);
            if (clientId) appendToAssistantMessage(clientId, event.delta);
          }
          if (event.type === "narrator.message.end") {
            const clientId = streamingMap.get(event.messageId);
            if (clientId) {
              finalizeAssistantMessage(clientId);
              streamingMap.delete(event.messageId);
            }
          }
          if (event.type === "refinement.plan.ready") {
            dispatch({ type: "REFINE_PLAN_READY", plan: event.plan });
          }
          if (event.type === "refinement.plan.not_actionable") {
            dispatch({
              type: "REFINE_PLAN_NOT_ACTIONABLE",
              reason: event.reason,
            });
          }
          if (event.type === "refinement.plan.error") {
            dispatch({
              type: "REFINE_PLAN_ERROR",
              error: {
                phase: "planning_refinement",
                message: event.error,
                recoverable: true,
              },
            });
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      dispatch({
        type: "REFINE_PLAN_ERROR",
        error: {
          phase: "planning_refinement",
          message: err instanceof Error ? err.message : "unknown",
          recoverable: true,
        },
      });
    } finally {
      setPending(false);
    }
  };

  const confirmPlan = () => dispatch({ type: "REFINE_CONFIRM" });
  const cancelPlan = () => dispatch({ type: "REFINE_CANCEL" });

  return { requestPlan, confirmPlan, cancelPlan, pending };
}

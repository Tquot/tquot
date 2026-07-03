"use client";

import { useEffect, useRef } from "react";
import { nanoid } from "nanoid";
import { streamParseEvents } from "@/lib/quote-conversation/sse-client";
import { useQuoteConversationStore, selectStatus } from "@/lib/quote-conversation/store";

export function useStreamingParser() {
  const status = useQuoteConversationStore(selectStatus);
  const parsingInput = useQuoteConversationStore((store) =>
    store.state.status === "parsing" ? store.state.input : "",
  );
  const parsingLocale = useQuoteConversationStore((store) =>
    store.state.status === "parsing"
      ? (store.state.partial.locale ?? "es")
      : "es",
  );
  const parsingPreviousPartial = useQuoteConversationStore((store) =>
    store.state.status === "parsing" ? store.state.previousPartial : undefined,
  );
  const parsingPreviousQuestions = useQuoteConversationStore((store) =>
    store.state.status === "parsing" ? store.state.previousQuestions : undefined,
  );
  const parseAbortRef = useRef<AbortController | null>(null);
  const parseRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "parsing" || !parsingInput) {
      return;
    }

    parseAbortRef.current?.abort();
    const controller = new AbortController();
    parseAbortRef.current = controller;
    const runId = nanoid();
    parseRunIdRef.current = runId;

    void streamParseEvents(
      {
        text: parsingInput,
        locale: parsingLocale,
        previousPartial: parsingPreviousPartial,
        questions: parsingPreviousQuestions,
      },
      { signal: controller.signal },
    )
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") return;
        if (parseRunIdRef.current !== runId) return;

        useQuoteConversationStore.getState().dispatch({
          type: "PARSE_ERROR",
          error: {
            phase: "parsing",
            message: error instanceof Error ? error.message : "parse_failed",
            recoverable: true,
            cause: error,
          },
        });
      })
      .finally(() => {
        if (parseRunIdRef.current === runId) {
          parseRunIdRef.current = null;
        }
      });

    return () => {
      controller.abort();
    };
  }, [status, parsingInput, parsingLocale, parsingPreviousPartial, parsingPreviousQuestions]);

  const startParsing = (_input: string) => {
    // Parsing starts via USER_SUBMIT + useEffect on status === 'parsing'
  };

  const cancelParsing = () => {
    parseAbortRef.current?.abort();
    parseAbortRef.current = null;
  };

  return { startParsing, cancelParsing };
}

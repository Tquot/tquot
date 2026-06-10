"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  useQuoteConversationStore,
  selectBuildProgress,
  selectCurrentQuote,
  selectError,
  selectIsLocked,
  selectMessages,
  selectAwaitingAirports,
  selectNeedsInput,
  selectParsedTripInput,
  selectParsingPartial,
  selectStatus,
} from "@/lib/quote-engine/store";
import type { AirportFlightChoices } from "@/lib/quotes/build-quote";
import {
  streamBuildEvents,
  streamParseEvents,
} from "@/lib/quote-engine/sse-client";
import { applyClientRefinement } from "@/lib/quote-engine/refine-client";
import type {
  ConversationError,
  ConversationState,
  RefinementOperation,
} from "@/lib/quote-engine/types";
import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import type {
  RefineAction,
  RefineApplyResult,
} from "@/lib/quotes/refine/types";
import { isServerRefinementAction } from "@/lib/quotes/refine/utils";

async function resolveAgentId(): Promise<string> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? "test-agent";
}

export function useQuoteBuilder() {
  const state = useQuoteConversationStore((store) => store.state);
  const [isParsing, setIsParsing] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const parseAbortRef = useRef<AbortController | null>(null);
  const buildAbortRef = useRef<AbortController | null>(null);
  const parseRunIdRef = useRef<string | null>(null);
  const buildRunIdRef = useRef<string | null>(null);
  const buildInFlightRef = useRef(false);

  useEffect(() => {
    if (state.status !== "parsing") {
      setIsParsing(false);
      return;
    }

    parseAbortRef.current?.abort();
    const controller = new AbortController();
    parseAbortRef.current = controller;
    const runId = nanoid();
    parseRunIdRef.current = runId;
    setIsParsing(true);

    const locale = state.partial.locale ?? "es";

    void streamParseEvents(
      { text: state.input, locale },
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
          setIsParsing(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [state.status, state.status === "parsing" ? state.input : ""]);

  useEffect(() => {
    if (state.status !== "building") {
      buildInFlightRef.current = false;
      setIsBuilding(false);
      return;
    }

    if (buildInFlightRef.current) {
      return;
    }
    buildInFlightRef.current = true;

    buildAbortRef.current?.abort();
    const controller = new AbortController();
    buildAbortRef.current = controller;
    const runId = nanoid();
    buildRunIdRef.current = runId;
    setIsBuilding(true);

    void streamBuildEvents(state.parsed, { signal: controller.signal })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") return;
        if (buildRunIdRef.current !== runId) return;

        useQuoteConversationStore.getState().dispatch({
          type: "BUILD_ERROR",
          error: {
            phase: "building",
            message: error instanceof Error ? error.message : "build_failed",
            recoverable: true,
            cause: error,
          },
        });
      })
      .finally(() => {
        if (buildRunIdRef.current === runId) {
          buildRunIdRef.current = null;
          buildInFlightRef.current = false;
          setIsBuilding(false);
        }
      });

    return () => {
      controller.abort();
      buildInFlightRef.current = false;
    };
  }, [state.status, state.status === "building" ? state.parsed : null]);

  const cancelParse = useCallback(() => {
    parseAbortRef.current?.abort();
    parseAbortRef.current = null;
    setIsParsing(false);
  }, []);

  const cancelBuild = useCallback(() => {
    buildAbortRef.current?.abort();
    buildAbortRef.current = null;
    setIsBuilding(false);
  }, []);

  return {
    isParsing,
    isBuilding,
    cancelParse,
    cancelBuild,
  };
}

export function useChatRefinement() {
  const status = useQuoteConversationStore(selectStatus);
  const conversationState = useQuoteConversationStore((store) => store.state);
  const dispatch = useQuoteConversationStore((store) => store.dispatch);
  const addUserMessage = useQuoteConversationStore((store) => store.addUserMessage);
  const addAssistantMessage = useQuoteConversationStore(
    (store) => store.addAssistantMessage,
  );
  const addSystemEvent = useQuoteConversationStore((store) => store.addSystemEvent);
  const [isRefining, setIsRefining] = useState(false);
  const operationSeqRef = useRef(0);

  const submitRefinement = useCallback(
    async (message: string, operation?: RefinementOperation) => {
      const trimmed = message.trim();
      if (!trimmed || status !== "complete") return;
      if (conversationState.status !== "complete") return;

      const quote = conversationState.quote;
      const tripInput = conversationState.parsed;
      const operationId = nanoid();
      const seq = ++operationSeqRef.current;

      addUserMessage(trimmed);
      setIsRefining(true);

      if (operation) {
        dispatch({ type: "REFINE_START", operation, operationId });
      }

      try {
        const agentId = await resolveAgentId();

        let refineAction: RefineAction;
        if (operation) {
          refineAction = operation;
        } else {
          const classifyResponse = await fetch("/api/quote/refine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currentQuote: quote,
              message: trimmed,
              tripInput,
              agentId,
            }),
          });

          const classifyData = await classifyResponse.json();
          if (!classifyResponse.ok) {
            throw new Error(classifyData.error ?? "Refinement request failed");
          }

          refineAction = classifyData.action as RefineAction;
          dispatch({ type: "REFINE_START", operation: refineAction, operationId });
        }

        if (seq !== operationSeqRef.current) return;

        let responseText = "He actualizado la cotización.";
        let nextQuote: Quote = quote;
        let nextTripInput: ParsedTripInput = tripInput;

        if (refineAction.action === "explain" || refineAction.action === "unknown") {
          responseText = refineAction.params.text;
        } else if (
          refineAction.action === "cheaper" ||
          refineAction.action === "filter_direct_flights"
        ) {
          const clientResult = applyClientRefinement(
            { message: "" },
            quote,
            tripInput,
            refineAction,
          );
          if (clientResult) {
            nextQuote = clientResult.quote;
            nextTripInput = clientResult.tripInput ?? tripInput;
            responseText = clientResult.message;
          }
        } else if (isServerRefinementAction(refineAction)) {
          const applyResponse = await fetch("/api/quote/refine/apply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: refineAction,
              currentQuote: quote,
              tripInput,
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
            tripInput,
            refineAction,
          );

          if (clientResult) {
            nextQuote = clientResult.quote;
            nextTripInput = clientResult.tripInput ?? tripInput;
            responseText = clientResult.suggestion
              ? `${clientResult.message}\n\n${clientResult.suggestion}`
              : clientResult.message;
          } else {
            responseText = applyData.suggestion
              ? `${applyData.message}\n\n${applyData.suggestion}`
              : applyData.message;
          }
        }

        if (seq !== operationSeqRef.current) return;

        dispatch({
          type: "REFINE_COMPLETE",
          quote: nextQuote,
          operationId,
          parsed: nextTripInput,
        });
        addSystemEvent("refinement-applied", { action: refineAction.action });
        addAssistantMessage(responseText);
      } catch (error) {
        if (seq !== operationSeqRef.current) return;

        const refineError: ConversationError = {
          phase: "refining",
          message: error instanceof Error ? error.message : "refine_failed",
          recoverable: true,
          cause: error,
        };
        dispatch({ type: "REFINE_ERROR", error: refineError, operationId });
        addAssistantMessage(refineError.message);
        addSystemEvent("error", { message: refineError.message });
      } finally {
        if (seq === operationSeqRef.current) {
          setIsRefining(false);
        }
      }
    },
    [
      status,
      conversationState,
      dispatch,
      addUserMessage,
      addAssistantMessage,
      addSystemEvent,
    ],
  );

  return {
    isRefining,
    submitRefinement,
  };
}

export function useConversation() {
  const status = useQuoteConversationStore(selectStatus);
  const messages = useQuoteConversationStore(selectMessages);
  const isLocked = useQuoteConversationStore(selectIsLocked);
  const error = useQuoteConversationStore(selectError);
  const needsInput = useQuoteConversationStore(selectNeedsInput);
  const awaitingAirports = useQuoteConversationStore(selectAwaitingAirports);
  const parsingPartial = useQuoteConversationStore(selectParsingPartial);
  const buildProgress = useQuoteConversationStore(selectBuildProgress);
  const quote = useQuoteConversationStore(selectCurrentQuote);
  const parsedTripInput = useQuoteConversationStore(selectParsedTripInput);

  const dispatch = useQuoteConversationStore((store) => store.dispatch);
  const addUserMessage = useQuoteConversationStore((store) => store.addUserMessage);
  const updateQuote = useQuoteConversationStore((store) => store.updateQuote);
  const reset = useQuoteConversationStore((store) => store.reset);

  const confirmAirports = useCallback(
    (airportChoices: AirportFlightChoices) => {
      dispatch({ type: "AIRPORTS_CONFIRMED", airportChoices });
    },
    [dispatch],
  );

  const { isParsing, isBuilding, cancelParse, cancelBuild } = useQuoteBuilder();
  const { submitRefinement, isRefining } = useChatRefinement();

  const submitInitialRequest = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;
      addUserMessage(trimmed);
      dispatch({ type: "USER_SUBMIT", input: trimmed });
    },
    [addUserMessage, dispatch],
  );

  const cancel = useCallback(() => {
    cancelParse();
    cancelBuild();
  }, [cancelParse, cancelBuild]);

  const retry = useCallback(() => {
    dispatch({ type: "RETRY" });
  }, [dispatch]);

  return {
    status,
    messages,
    isLocked,
    isParsing,
    isBuilding,
    isRefining,
    error,
    needsInput,
    awaitingAirports,
    parsingPartial,
    buildProgress,
    quote,
    parsedTripInput,
    updateQuote,
    confirmAirports,
    submitInitialRequest,
    submitRefinement,
    cancel,
    retry,
    reset,
  };
}

export type { ConversationState };

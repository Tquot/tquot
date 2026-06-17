"use client";

import { useCallback } from "react";
import {
  useQuoteConversationStore,
  selectStatus,
  selectMessages,
  selectCurrentQuote,
  selectError,
  selectIsLocked,
  selectNeedsInput,
  selectAwaitingAirports,
  selectParsedTripInput,
  selectParsingPartial,
  selectBuildProgress,
} from "@/lib/quote-conversation/store";
import { useStreamingParser } from "@/hooks/useStreamingParser";
import { useQuoteBuilder } from "@/hooks/useQuoteBuilder";
import { useRefinementPlan } from "@/hooks/useRefinementPlan";
import { useRefinement } from "@/hooks/useRefinement";
import type { AirportFlightChoices, Quote } from "@/lib/quotes/build-quote";

export function useQuoteConversation() {
  const status = useQuoteConversationStore(selectStatus);
  const messages = useQuoteConversationStore(selectMessages);
  const state = useQuoteConversationStore((store) => store.state);
  const dispatch = useQuoteConversationStore((store) => store.dispatch);
  const addUserMessage = useQuoteConversationStore((store) => store.addUserMessage);
  const updateQuote = useQuoteConversationStore((store) => store.updateQuote);
  const reset = useQuoteConversationStore((store) => store.reset);
  const isLocked = useQuoteConversationStore(selectIsLocked);
  const error = useQuoteConversationStore(selectError);
  const needsInput = useQuoteConversationStore(selectNeedsInput);
  const awaitingAirports = useQuoteConversationStore(selectAwaitingAirports);
  const parsingPartial = useQuoteConversationStore(selectParsingPartial);
  const buildProgress = useQuoteConversationStore(selectBuildProgress);
  const quote = useQuoteConversationStore(selectCurrentQuote);
  const parsedTripInput = useQuoteConversationStore(selectParsedTripInput);

  const { startParsing, cancelParsing } = useStreamingParser();
  const { isBuilding, cancelBuild } = useQuoteBuilder();
  const { requestPlan, confirmPlan, cancelPlan, pending: planPending } =
    useRefinementPlan();
  useRefinement();

  const submitInitialRequest = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;
      addUserMessage(trimmed);
      dispatch({ type: "USER_SUBMIT", input: trimmed });
      startParsing(trimmed);
    },
    [addUserMessage, dispatch, startParsing],
  );

  const submitRefinement = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;
      if (status !== "complete" && status !== "awaiting_confirmation") return;

      const store = useQuoteConversationStore.getState();
      const currentQuote = selectCurrentQuote(store);
      const parsed = parsedTripInput;
      if (!currentQuote || !("pricing" in currentQuote) || !parsed) return;

      addUserMessage(trimmed);
      void requestPlan(currentQuote as Quote, parsed, trimmed);
    },
    [status, parsedTripInput, addUserMessage, requestPlan],
  );

  const confirmAirports = useCallback(
    (airportChoices: AirportFlightChoices) => {
      dispatch({ type: "AIRPORTS_CONFIRMED", airportChoices });
    },
    [dispatch],
  );

  const cancel = useCallback(() => {
    cancelParsing();
    cancelBuild();
  }, [cancelParsing, cancelBuild]);

  const retry = useCallback(() => {
    dispatch({ type: "RETRY" });
  }, [dispatch]);

  return {
    status,
    messages,
    state,
    isLocked,
    isParsing: status === "parsing",
    isBuilding,
    isRefining: status === "refining",
    planPending,
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
    confirmPlan,
    cancelPlan,
    cancel,
    retry,
    reset,
  };
}

export type { ConversationState } from "@/lib/quote-conversation/types";

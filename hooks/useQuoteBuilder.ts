"use client";

import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { streamBuildEvents } from "@/lib/quote-conversation/sse-client";
import { useQuoteConversationStore } from "@/lib/quote-conversation/store";
import type { ConversationStreamEvent } from "@/lib/quote-conversation/types";

export function useQuoteBuilder() {
  const status = useQuoteConversationStore((store) => store.state.status);
  const buildingParsed = useQuoteConversationStore((store) =>
    store.state.status === "building" ? store.state.parsed : null,
  );
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
  const [isBuilding, setIsBuilding] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const streamingMessages = useRef<Map<string, string>>(new Map());
  const buildRunIdRef = useRef<string | null>(null);
  const buildInFlightRef = useRef(false);

  useEffect(() => {
    if (status !== "building" || !buildingParsed) {
      buildInFlightRef.current = false;
      setIsBuilding(false);
      return;
    }

    if (buildInFlightRef.current) {
      return;
    }
    buildInFlightRef.current = true;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const runId = nanoid();
    buildRunIdRef.current = runId;
    setIsBuilding(true);

    void streamBuildEvents(buildingParsed, {
      signal: controller.signal,
      autoDispatch: false,
      onEvent: (event: ConversationStreamEvent) => {
        if (
          event.type === "build.started" ||
          event.type === "section.started" ||
          event.type === "section.provider" ||
          event.type === "section.partial" ||
          event.type === "section.done" ||
          event.type === "section.error"
        ) {
          dispatch({ type: "BUILD_EVENT", event });
        }

        if (event.type === "build.done") {
          dispatch({ type: "BUILD_COMPLETE", quote: event.quote });
          setIsBuilding(false);
          buildInFlightRef.current = false;
        }
        if (event.type === "build.error") {
          dispatch({
            type: "BUILD_ERROR",
            error: { phase: "building", message: event.error, recoverable: true },
          });
          setIsBuilding(false);
          buildInFlightRef.current = false;
        }

        if (event.type === "narrator.message.complete") {
          addAssistantMessage(event.content, { streaming: false });
        }
        if (event.type === "narrator.message.start") {
          const clientId = addAssistantMessage("", { streaming: true });
          streamingMessages.current.set(event.messageId, clientId);
        }
        if (event.type === "narrator.message.delta") {
          const clientId = streamingMessages.current.get(event.messageId);
          if (clientId) appendToAssistantMessage(clientId, event.delta);
        }
        if (event.type === "narrator.message.end") {
          const clientId = streamingMessages.current.get(event.messageId);
          if (clientId) {
            finalizeAssistantMessage(clientId);
            streamingMessages.current.delete(event.messageId);
          }
        }
      },
      onError: (err) => {
        if (err.name === "AbortError") return;
        if (buildRunIdRef.current !== runId) return;
        dispatch({
          type: "BUILD_ERROR",
          error: {
            phase: "building",
            message: err.message,
            recoverable: true,
            cause: err,
          },
        });
        setIsBuilding(false);
        buildInFlightRef.current = false;
      },
    })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        if (buildRunIdRef.current !== runId) return;
        dispatch({
          type: "BUILD_ERROR",
          error: {
            phase: "building",
            message: err instanceof Error ? err.message : "build_failed",
            recoverable: true,
            cause: err,
          },
        });
        setIsBuilding(false);
        buildInFlightRef.current = false;
      })
      .finally(() => {
        streamingMessages.current.clear();
        if (buildRunIdRef.current === runId) {
          buildRunIdRef.current = null;
        }
      });

    return () => {
      controller.abort();
      buildInFlightRef.current = false;
    };
  }, [
    status,
    buildingParsed,
    dispatch,
    addAssistantMessage,
    appendToAssistantMessage,
    finalizeAssistantMessage,
  ]);

  return {
    isBuilding,
    cancelBuild: () => {
      abortRef.current?.abort();
      buildInFlightRef.current = false;
    },
  };
}

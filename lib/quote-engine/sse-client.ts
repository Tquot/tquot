"use client";

import type { ConversationAction } from "@/lib/quote-engine/types";
import type { BuildEvent, ParseEvent } from "@/lib/quote-engine/types";
import { useQuoteConversationStore } from "@/lib/quote-engine/store";

export type SseTerminalResult = "complete" | "needs_input" | "error" | "aborted";

export interface StreamSseOptions<T> {
  signal?: AbortSignal;
  onEvent?: (event: T) => void;
  onError?: (error: Error) => void;
  retries?: number;
  retryDelayMs?: number;
}

const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function parseSseChunk<T>(
  raw: string,
  guard: (value: unknown) => value is T,
): T | null {
  const dataLine = raw.split("\n").find((line) => line.startsWith("data:"));
  if (!dataLine) return null;

  const json = dataLine.slice(5).trim();
  if (!json) return null;

  try {
    const value: unknown = JSON.parse(json);
    return guard(value) ? value : null;
  } catch {
    return null;
  }
}

async function readSseStream<T>(
  response: Response,
  guard: (value: unknown) => value is T,
  onEvent: (event: T) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!response.body) {
    throw new Error("sse_missing_body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    if (signal?.aborted) {
      const err = new Error("SSE stream aborted");
      err.name = "AbortError";
      throw err;
    }

    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const raw of parts) {
      if (raw.startsWith(":")) continue;
      const event = parseSseChunk(raw, guard);
      if (event) onEvent(event);
    }
  }
}

async function streamSsePost<T>(
  url: string,
  body: unknown,
  guard: (value: unknown) => value is T,
  options: StreamSseOptions<T>,
): Promise<void> {
  const {
    signal,
    onEvent = () => {},
    onError = () => {},
    retries = DEFAULT_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (signal?.aborted) {
      const err = new Error("SSE request aborted");
      err.name = "AbortError";
      throw err;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        throw new Error(`sse_http_${response.status}`);
      }

      await readSseStream(response, guard, onEvent, signal);
      return;
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error("sse_unknown_error");
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
    }
  }

  onError(lastError ?? new Error("sse_failed"));
  throw lastError ?? new Error("sse_failed");
}

function isParseEvent(value: unknown): value is ParseEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as ParseEvent).type === "string" &&
    (value as ParseEvent).type.startsWith("parse.")
  );
}

function isBuildEvent(value: unknown): value is BuildEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as BuildEvent).type === "string" &&
    ((value as BuildEvent).type.startsWith("build.") ||
      (value as BuildEvent).type.startsWith("section."))
  );
}

export function dispatchParseEvent(event: ParseEvent): SseTerminalResult {
  const { dispatch, addSystemEvent } = useQuoteConversationStore.getState();

  switch (event.type) {
    case "parse.started":
      addSystemEvent("parsing-started");
      return "complete";

    case "parse.progress":
      if (event.partial) {
        dispatch({ type: "PARSE_PROGRESS", partial: event.partial });
      }
      return "complete";

    case "parse.needs_input":
      dispatch({
        type: "PARSE_NEEDS_INPUT",
        questions: event.questions,
        partial: event.partial,
      });
      addSystemEvent("error", {
        kind: "parse_needs_input",
        questions: event.questions,
      });
      return "needs_input";

    case "parse.complete":
      dispatch({ type: "PARSE_COMPLETE", parsed: event.parsed });
      addSystemEvent("parsing-completed", { parsed: event.parsed });
      return "complete";

    case "parse.error":
      dispatch({
        type: "PARSE_ERROR",
        error: {
          phase: "parsing",
          message: event.error,
          recoverable: true,
        },
      });
      addSystemEvent("error", { message: event.error });
      return "error";
  }
}

export function dispatchBuildEvent(event: BuildEvent): SseTerminalResult {
  const { dispatch, addSystemEvent } = useQuoteConversationStore.getState();

  switch (event.type) {
    case "build.started":
      addSystemEvent("building-started");
      dispatch({ type: "BUILD_EVENT", event });
      return "complete";

    case "section.done":
      addSystemEvent("section-completed", { section: event.section });
      dispatch({ type: "BUILD_EVENT", event });
      return "complete";

    case "section.error":
      addSystemEvent("section-error", {
        section: event.section,
        error: event.error,
      });
      dispatch({ type: "BUILD_EVENT", event });
      return "complete";

    case "build.done":
      dispatch({ type: "BUILD_EVENT", event });
      dispatch({ type: "BUILD_COMPLETE", quote: event.quote });
      addSystemEvent("build-completed");
      return "complete";

    case "build.error":
      dispatch({
        type: "BUILD_ERROR",
        error: {
          phase: "building",
          message: event.error,
          recoverable: true,
        },
      });
      addSystemEvent("error", { message: event.error });
      return "error";

    default:
      dispatch({ type: "BUILD_EVENT", event });
      return "complete";
  }
}

export async function streamParseEvents(
  body: { text: string; locale?: "es" | "en"; languageHint?: "es" | "en" },
  options: StreamSseOptions<ParseEvent> = {},
): Promise<SseTerminalResult> {
  let terminal: SseTerminalResult = "complete";

  await streamSsePost(
    "/api/quote/parse",
    {
      ...body,
      currentDate: new Date().toISOString().slice(0, 10),
    },
    isParseEvent,
    {
      ...options,
      onEvent: (event) => {
        options.onEvent?.(event);
        const result = dispatchParseEvent(event);
        if (result !== "complete") {
          terminal = result;
        }
      },
    },
  );

  return terminal;
}

export async function streamBuildEvents(
  body: unknown,
  options: StreamSseOptions<BuildEvent> = {},
): Promise<SseTerminalResult> {
  let terminal: SseTerminalResult = "complete";

  await streamSsePost("/api/quote/build", body, isBuildEvent, {
    ...options,
    onEvent: (event) => {
      options.onEvent?.(event);
      const result = dispatchBuildEvent(event);
      if (result === "error") {
        terminal = "error";
      }
    },
  });

  return terminal;
}

export function dispatchConversationAction(action: ConversationAction): void {
  useQuoteConversationStore.getState().dispatch(action);
}

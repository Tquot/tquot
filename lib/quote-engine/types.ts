import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import type { RefineAction } from "@/lib/quotes/refine/types";

export type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";

/** Refinement intent applied after the initial quote is complete (maps to existing refine actions). */
export type RefinementOperation = RefineAction;

// ─────────────────────────────────────────────────────────
// Conversation messages
// ─────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";

export interface UserMessage {
  id: string;
  role: "user";
  content: string;
  timestamp: number;
}

export interface AssistantMessage {
  id: string;
  role: "assistant";
  content: string;
  timestamp: number;
  streaming?: boolean;
  metadata?: AssistantMessageMetadata;
}

export interface AssistantMessageMetadata {
  phase?: ConversationPhase;
  refinementId?: string;
}

export type SystemEventType =
  | "parsing-started"
  | "parsing-completed"
  | "building-started"
  | "section-completed"
  | "section-error"
  | "build-completed"
  | "refinement-applied"
  | "error";

export interface SystemMessage {
  id: string;
  role: "system";
  type: SystemEventType;
  payload: Record<string, unknown>;
  timestamp: number;
}

export type Message = UserMessage | AssistantMessage | SystemMessage;

// ─────────────────────────────────────────────────────────
// Canvas section progress
// ─────────────────────────────────────────────────────────

export type QuoteSection = "flights" | "hotels" | "experiences" | "transfers";

export type SectionStatus =
  | { kind: "pending" }
  | { kind: "searching"; provider?: string }
  | { kind: "partial"; results: unknown[]; provider?: string }
  | { kind: "done"; results: unknown[] }
  | { kind: "error"; error: string; skipped: boolean };

export type BuildProgress = Record<QuoteSection, SectionStatus>;

export const initialBuildProgress: BuildProgress = {
  flights: { kind: "pending" },
  hotels: { kind: "pending" },
  experiences: { kind: "pending" },
  transfers: { kind: "pending" },
};

// ─────────────────────────────────────────────────────────
// Build stream protocol (SSE)
// ─────────────────────────────────────────────────────────

export type BuildEvent =
  | { type: "build.started"; ts: number }
  | { type: "section.started"; section: QuoteSection; ts: number }
  | {
      type: "section.provider";
      section: QuoteSection;
      provider: string;
      status: "searching" | "ok" | "failed";
      ts: number;
    }
  | { type: "section.partial"; section: QuoteSection; results: unknown[]; ts: number }
  | { type: "section.done"; section: QuoteSection; results: unknown[]; ts: number }
  | {
      type: "section.error";
      section: QuoteSection;
      error: string;
      skipped: boolean;
      ts: number;
    }
  | { type: "build.done"; quote: Quote; ts: number }
  | { type: "build.error"; error: string; ts: number };

// ─────────────────────────────────────────────────────────
// Parse stream protocol (SSE)
// ─────────────────────────────────────────────────────────

export type ParseStage =
  | "started"
  | "anonymizing"
  | "extracting"
  | "enriching"
  | "mapping";

export type ParseEvent =
  | { type: "parse.started"; ts: number }
  | {
      type: "parse.progress";
      stage: ParseStage;
      partial?: Partial<ParsedTripInput>;
      ts: number;
    }
  | {
      type: "parse.needs_input";
      questions: string[];
      partial: Partial<ParsedTripInput>;
      ts: number;
    }
  | { type: "parse.complete"; parsed: ParsedTripInput; ts: number }
  | { type: "parse.error"; error: string; ts: number };

// ─────────────────────────────────────────────────────────
// State machine
// ─────────────────────────────────────────────────────────

export type ConversationPhase =
  | "idle"
  | "parsing"
  | "building"
  | "complete"
  | "refining"
  | "error";

export interface ConversationError {
  phase: Exclude<ConversationPhase, "idle" | "error">;
  message: string;
  recoverable: boolean;
  cause?: unknown;
}

export type ConversationState =
  | { status: "idle" }
  | {
      status: "parsing";
      input: string;
      partial: Partial<ParsedTripInput>;
    }
  | {
      status: "needs_input";
      input: string;
      questions: string[];
      partial: Partial<ParsedTripInput>;
    }
  | {
      status: "building";
      parsed: ParsedTripInput;
      progress: BuildProgress;
      partialQuote: Partial<Quote>;
    }
  | {
      status: "complete";
      parsed: ParsedTripInput;
      quote: Quote;
    }
  | {
      status: "refining";
      parsed: ParsedTripInput;
      quote: Quote;
      operation: RefinementOperation;
      operationId: string;
    }
  | {
      status: "error";
      error: ConversationError;
      previousState: ConversationState;
    };

export type ConversationAction =
  | { type: "USER_SUBMIT"; input: string }
  | { type: "PARSE_PROGRESS"; partial: Partial<ParsedTripInput> }
  | { type: "PARSE_COMPLETE"; parsed: ParsedTripInput }
  | {
      type: "PARSE_NEEDS_INPUT";
      questions: string[];
      partial: Partial<ParsedTripInput>;
    }
  | { type: "PARSE_ERROR"; error: ConversationError }
  | { type: "BUILD_START"; parsed: ParsedTripInput }
  | { type: "BUILD_EVENT"; event: BuildEvent }
  | { type: "BUILD_COMPLETE"; quote: Quote }
  | { type: "BUILD_ERROR"; error: ConversationError }
  | { type: "REFINE_START"; operation: RefinementOperation; operationId: string }
  | {
      type: "REFINE_COMPLETE";
      quote: Quote;
      operationId: string;
      parsed?: ParsedTripInput;
    }
  | { type: "REFINE_ERROR"; error: ConversationError; operationId: string }
  | { type: "RETRY" }
  | { type: "RESET" };

import type {
  AirportFlightChoices,
  ParsedTripInput,
  Quote,
} from "@/lib/quotes/build-quote";
import type { RefineAction } from "@/lib/quotes/refine/types";
import type { RecommendedProvider } from "@/lib/recommendations/types";

export type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";

export type RefinementOperation = RefineAction;

// ─────────────────────────────────────────────────────────
// Hotel price comparison (snapshot vs live)
// ─────────────────────────────────────────────────────────

export type HotelProvider = "hotelbeds" | "booking" | "expedia";

export interface HotelPriceQuote {
  provider: HotelProvider;
  netPrice: number;
  currency: string;
  rateKey?: string;
  fetchedAt: string;
  source: "snapshot" | "live";
  stale?: boolean;
  meta?: Record<string, unknown>;
}

export interface HotelDetails {
  id: string;
  name: string;
  provider: HotelProvider;
  netPrice: number;
  currency: string;
  rateKey?: string;
  fetchedAt: string;
  hotelCode?: string;
  providerId?: string;
  connectionId?: string;
}

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

export type LegBuildProgress = Record<QuoteSection, SectionStatus>;

export type BuildProgress = Record<string, LegBuildProgress>;

export const initialBuildProgress: BuildProgress = {};

// ─────────────────────────────────────────────────────────
// Build stream protocol (SSE)
// ─────────────────────────────────────────────────────────

export type BuildEvent =
  | { type: "build.started"; ts: number }
  | { type: "section.started"; section: QuoteSection; legId?: string; ts: number }
  | {
      type: "section.provider";
      section: QuoteSection;
      legId?: string;
      provider: string;
      status: "searching" | "ok" | "failed";
      ts: number;
    }
  | {
      type: "section.partial";
      section: QuoteSection;
      legId?: string;
      results: unknown[];
      ts: number;
    }
  | { type: "section.done"; section: QuoteSection; legId?: string; results: unknown[]; ts: number }
  | {
      type: "section.error";
      section: QuoteSection;
      legId?: string;
      error: string;
      skipped: boolean;
      ts: number;
    }
  | { type: "build.done"; quote: Quote; ts: number }
  | { type: "build.error"; error: string; ts: number };

export type RecommendationEvent =
  | {
      type: "recommendation.started";
      category: string;
      legId?: string;
      ts: number;
    }
  | {
      type: "recommendation.done";
      category: string;
      legId?: string;
      providers: RecommendedProvider[];
      source: "cache" | "fresh";
      ts: number;
    }
  | {
      type: "recommendation.error";
      category: string;
      legId?: string;
      error: string;
      ts: number;
    };

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
// Narrador
// ─────────────────────────────────────────────────────────

export type NarratorPhase =
  | "opening"
  | "progress"
  | "summary"
  | "refinement_plan"
  | "refinement_done"
  | "clarification";

export type NarratorEvent =
  | {
      type: "narrator.message.complete";
      messageId: string;
      content: string;
      phase: NarratorPhase;
      ts: number;
    }
  | {
      type: "narrator.message.start";
      messageId: string;
      phase: NarratorPhase;
      ts: number;
    }
  | {
      type: "narrator.message.delta";
      messageId: string;
      delta: string;
      ts: number;
    }
  | {
      type: "narrator.message.end";
      messageId: string;
      ts: number;
    };

// ─────────────────────────────────────────────────────────
// Refinamiento con plan
// ─────────────────────────────────────────────────────────

export type RefinementIntent =
  | { kind: "change_hotel"; criteria: string }
  | { kind: "change_flight"; criteria: string }
  | { kind: "change_dates"; newCheckIn?: string; newCheckOut?: string }
  | { kind: "add_service"; service: string }
  | {
      kind: "remove_service";
      service: "flight" | "hotel" | "experience" | "transfer" | string;
    }
  | { kind: "change_pax"; adults?: number; children?: number }
  | {
      kind: "change_budget";
      tier?: "budget" | "mid" | "premium" | "luxury";
      amount?: number;
    }
  | { kind: "free_text"; text: string };

export interface RefinementImpact {
  affectedSections: QuoteSection[];
  priceChangeEstimate?: {
    min: number;
    max: number;
    currency: string;
    direction: "up" | "down" | "unknown";
  };
  reasoning: string;
}

export interface PlannedRefinement {
  id: string;
  userInput: string;
  intent: RefinementIntent;
  planMessage: string;
  operation: RefinementOperation;
  estimatedImpact: RefinementImpact;
  createdAt: string;
}

export type RefinementPlanEvent =
  | { type: "refinement.intent_classified"; intent: RefinementIntent; ts: number }
  | { type: "refinement.plan.ready"; plan: PlannedRefinement; ts: number }
  | { type: "refinement.plan.not_actionable"; reason: string; ts: number }
  | { type: "refinement.plan.error"; error: string; ts: number };

export type ConversationStreamEvent =
  | BuildEvent
  | RecommendationEvent
  | NarratorEvent
  | RefinementPlanEvent;

// ─────────────────────────────────────────────────────────
// State machine
// ─────────────────────────────────────────────────────────

export type ConversationPhase =
  | "idle"
  | "parsing"
  | "needs_input"
  | "awaiting_airports"
  | "building"
  | "complete"
  | "planning_refinement"
  | "awaiting_confirmation"
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
      previousPartial?: Partial<ParsedTripInput>;
      previousQuestions?: string[];
    }
  | {
      status: "needs_input";
      input: string;
      questions: string[];
      partial: Partial<ParsedTripInput>;
    }
  | {
      status: "awaiting_airports";
      input: string;
      parsed: ParsedTripInput;
    }
  | {
      status: "building";
      parsed: ParsedTripInput;
      progress: BuildProgress;
      partialQuote: Partial<Quote>;
    }
  | { status: "complete"; parsed: ParsedTripInput; quote: Quote }
  | {
      status: "planning_refinement";
      parsed: ParsedTripInput;
      quote: Quote;
      userInput: string;
    }
  | {
      status: "awaiting_confirmation";
      parsed: ParsedTripInput;
      quote: Quote;
      plan: PlannedRefinement;
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
  | { type: "PARSE_AWAITING_AIRPORTS"; parsed: ParsedTripInput; input: string }
  | {
      type: "PARSE_NEEDS_INPUT";
      questions: string[];
      partial: Partial<ParsedTripInput>;
    }
  | { type: "PARSE_ERROR"; error: ConversationError }
  | { type: "AIRPORTS_CONFIRMED"; airportChoices: AirportFlightChoices }
  | { type: "UPDATE_QUOTE"; quote: Quote }
  | { type: "BUILD_START"; parsed: ParsedTripInput }
  | { type: "BUILD_EVENT"; event: BuildEvent }
  | { type: "BUILD_COMPLETE"; quote: Quote }
  | { type: "BUILD_ERROR"; error: ConversationError }
  | { type: "REFINE_COMPLETE"; quote: Quote; operationId: string; parsed?: ParsedTripInput }
  | { type: "REFINE_ERROR"; error: ConversationError; operationId: string }
  | { type: "RETRY" }
  | { type: "RESET" }
  | { type: "USER_REFINE_INPUT"; userInput: string }
  | { type: "REFINE_PLAN_READY"; plan: PlannedRefinement }
  | { type: "REFINE_PLAN_NOT_ACTIONABLE"; reason: string }
  | { type: "REFINE_PLAN_ERROR"; error: ConversationError }
  | { type: "REFINE_CONFIRM" }
  | { type: "REFINE_CANCEL" }
  | { type: "REFINE_AMEND"; userInput: string };

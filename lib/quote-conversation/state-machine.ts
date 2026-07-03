import type {
  ConversationState,
  ConversationAction,
  BuildProgress,
  BuildEvent,
  QuoteSection,
} from "./types";
import { initialBuildProgress } from "./types";
import type { Quote, QuoteItem } from "@/lib/quotes/build-quote";
import { sectionResultsToQuoteItems } from "@/lib/quote-engine/internal";

export const initialState: ConversationState = { status: "idle" };

export function conversationReducer(
  state: ConversationState,
  action: ConversationAction,
): ConversationState {
  switch (action.type) {
    case "USER_SUBMIT": {
      if (
        state.status !== "idle" &&
        state.status !== "complete" &&
        state.status !== "error" &&
        state.status !== "needs_input"
      ) {
        return state;
      }
      if (state.status === "needs_input") {
        return {
          status: "parsing",
          input: action.input,
          partial: {},
          previousPartial: state.partial,
        };
      }
      return { status: "parsing", input: action.input, partial: {} };
    }

    case "PARSE_PROGRESS": {
      if (state.status !== "parsing") return state;
      return { ...state, partial: { ...state.partial, ...action.partial } };
    }

    case "PARSE_COMPLETE": {
      if (state.status !== "parsing" && state.status !== "needs_input") {
        return state;
      }
      return {
        status: "building",
        parsed: action.parsed,
        progress: initialBuildProgress,
        partialQuote: {},
      };
    }

    case "PARSE_AWAITING_AIRPORTS": {
      if (state.status !== "parsing") return state;
      return {
        status: "awaiting_airports",
        input: action.input,
        parsed: action.parsed,
      };
    }

    case "AIRPORTS_CONFIRMED": {
      if (state.status !== "awaiting_airports") return state;
      return {
        status: "building",
        parsed: {
          ...state.parsed,
          airportChoices: action.airportChoices,
        },
        progress: initialBuildProgress,
        partialQuote: {},
      };
    }

    case "PARSE_NEEDS_INPUT": {
      if (state.status !== "parsing") return state;
      return {
        status: "needs_input",
        input: state.input,
        questions: action.questions,
        partial: action.partial,
      };
    }

    case "PARSE_ERROR": {
      if (
        state.status !== "parsing" &&
        state.status !== "needs_input" &&
        state.status !== "awaiting_airports"
      ) {
        return state;
      }
      return { status: "error", error: action.error, previousState: state };
    }

    case "UPDATE_QUOTE": {
      if (state.status === "complete") {
        return { ...state, quote: action.quote };
      }
      if (state.status === "refining") {
        return { ...state, quote: action.quote };
      }
      if (state.status === "awaiting_confirmation") {
        return { ...state, quote: action.quote };
      }
      if (state.status === "building") {
        return {
          ...state,
          partialQuote: {
            ...state.partialQuote,
            ...action.quote,
          },
        };
      }
      return state;
    }

    case "BUILD_START": {
      if (state.status !== "idle" && state.status !== "error") {
        return state;
      }
      return {
        status: "building",
        parsed: action.parsed,
        progress: initialBuildProgress,
        partialQuote: {},
      };
    }

    case "BUILD_EVENT": {
      if (state.status !== "building") return state;
      return applyBuildEvent(state, action.event);
    }

    case "BUILD_COMPLETE": {
      if (state.status !== "building") return state;
      return { status: "complete", parsed: state.parsed, quote: action.quote };
    }

    case "BUILD_ERROR": {
      if (state.status !== "building") return state;
      return { status: "error", error: action.error, previousState: state };
    }

    case "USER_REFINE_INPUT": {
      if (state.status === "complete") {
        return {
          status: "planning_refinement",
          parsed: state.parsed,
          quote: state.quote,
          userInput: action.userInput,
        };
      }
      if (state.status === "awaiting_confirmation") {
        return {
          status: "planning_refinement",
          parsed: state.parsed,
          quote: state.quote,
          userInput: action.userInput,
        };
      }
      return state;
    }

    case "REFINE_PLAN_READY": {
      if (state.status !== "planning_refinement") return state;
      return {
        status: "awaiting_confirmation",
        parsed: state.parsed,
        quote: state.quote,
        plan: action.plan,
      };
    }

    case "REFINE_PLAN_NOT_ACTIONABLE": {
      if (state.status !== "planning_refinement") return state;
      return { status: "complete", parsed: state.parsed, quote: state.quote };
    }

    case "REFINE_PLAN_ERROR": {
      if (state.status !== "planning_refinement") return state;
      return { status: "error", error: action.error, previousState: state };
    }

    case "REFINE_CONFIRM": {
      if (state.status !== "awaiting_confirmation") return state;
      return {
        status: "refining",
        parsed: state.parsed,
        quote: state.quote,
        operation: state.plan.operation,
        operationId: state.plan.id,
      };
    }

    case "REFINE_CANCEL": {
      if (state.status !== "awaiting_confirmation") return state;
      return { status: "complete", parsed: state.parsed, quote: state.quote };
    }

    case "REFINE_AMEND": {
      if (state.status !== "awaiting_confirmation") return state;
      return {
        status: "planning_refinement",
        parsed: state.parsed,
        quote: state.quote,
        userInput: action.userInput,
      };
    }

    case "REFINE_COMPLETE": {
      if (state.status !== "refining") return state;
      if (state.operationId !== action.operationId) return state;
      return {
        status: "complete",
        parsed: action.parsed ?? state.parsed,
        quote: action.quote,
      };
    }

    case "REFINE_ERROR": {
      if (state.status !== "refining") return state;
      if (state.operationId !== action.operationId) return state;
      return { status: "error", error: action.error, previousState: state };
    }

    case "RETRY": {
      if (state.status !== "error") return state;
      return state.previousState;
    }

    case "RESET":
      return initialState;

    default: {
      const _exhaustive: never = action;
      return state;
    }
  }
}

function sectionItemsToPartialQuote(
  section: QuoteSection,
  results: unknown[],
  existing: Partial<Quote>,
): Partial<Quote> {
  const items = results as QuoteItem[];
  switch (section) {
    case "flights":
      return { flights: [...(existing.flights ?? []), ...items] };
    case "hotels":
      return { hotels: [...(existing.hotels ?? []), ...items] };
    case "experiences":
      return { experiences: [...(existing.experiences ?? []), ...items] };
    case "transfers":
      return { transfers: [...(existing.transfers ?? []), ...items] };
    default:
      return {};
  }
}

function applyBuildEvent(
  state: Extract<ConversationState, { status: "building" }>,
  event: BuildEvent,
): ConversationState {
  const legId = "legId" in event && event.legId ? event.legId : "_global";
  const legProgress: BuildProgress[string] = {
    ...(state.progress[legId] ?? {
      flights: { kind: "pending" as const },
      hotels: { kind: "pending" as const },
      experiences: { kind: "pending" as const },
      transfers: { kind: "pending" as const },
    }),
  };

  switch (event.type) {
    case "build.started":
      return state;

    case "section.started":
      legProgress[event.section] = { kind: "searching" };
      return {
        ...state,
        progress: { ...state.progress, [legId]: legProgress },
      };

    case "section.provider":
      if (event.status === "searching") {
        legProgress[event.section] = { kind: "searching", provider: event.provider };
      }
      return {
        ...state,
        progress: { ...state.progress, [legId]: legProgress },
      };

    case "section.partial": {
      legProgress[event.section] = {
        kind: "partial",
        results: event.results,
      };
      const quoteItems = sectionResultsToQuoteItems(event.section, event.results);
      const partialQuote = {
        ...state.partialQuote,
        ...sectionItemsToPartialQuote(event.section, quoteItems, state.partialQuote),
      };
      return {
        ...state,
        progress: { ...state.progress, [legId]: legProgress },
        partialQuote,
      };
    }

    case "section.done": {
      legProgress[event.section] = { kind: "done", results: event.results };
      const quoteItems = sectionResultsToQuoteItems(event.section, event.results);
      const partialQuote = {
        ...state.partialQuote,
        ...sectionItemsToPartialQuote(event.section, quoteItems, state.partialQuote),
      };
      return {
        ...state,
        progress: { ...state.progress, [legId]: legProgress },
        partialQuote,
      };
    }

    case "section.error":
      legProgress[event.section] = {
        kind: "error",
        error: event.error,
        skipped: event.skipped,
      };
      return {
        ...state,
        progress: { ...state.progress, [legId]: legProgress },
      };

    case "build.done":
    case "build.error":
      return state;
  }
}

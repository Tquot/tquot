import type {
  BuildEvent,
  BuildProgress,
  ConversationAction,
  ConversationState,
  QuoteSection,
} from "@/lib/quote-engine/types";
import { initialBuildProgress } from "@/lib/quote-engine/types";
import type { Quote, QuoteItem } from "@/lib/quotes/build-quote";

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
        state.status !== "error"
      ) {
        return state;
      }
      return { status: "parsing", input: action.input, partial: {} };
    }

    case "PARSE_PROGRESS": {
      if (state.status !== "parsing") return state;
      return { ...state, partial: { ...state.partial, ...action.partial } };
    }

    case "PARSE_COMPLETE": {
      if (state.status !== "parsing") return state;
      return {
        status: "building",
        parsed: action.parsed,
        progress: initialBuildProgress,
        partialQuote: {},
      };
    }

    case "PARSE_ERROR": {
      if (state.status !== "parsing") return state;
      return { status: "error", error: action.error, previousState: state };
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

    case "REFINE_START": {
      if (state.status !== "complete") return state;
      return {
        status: "refining",
        parsed: state.parsed,
        quote: state.quote,
        operation: action.operation,
        operationId: action.operationId,
      };
    }

    case "REFINE_COMPLETE": {
      if (state.status !== "refining") return state;
      if (state.operationId !== action.operationId) return state;
      return { status: "complete", parsed: state.parsed, quote: action.quote };
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
): Partial<Quote> {
  const items = results as QuoteItem[];
  switch (section) {
    case "flights":
      return { flights: items };
    case "hotels":
      return { hotels: items };
    case "experiences":
      return { experiences: items };
    case "transfers":
      return { transfers: items };
    default:
      return {};
  }
}

function applyBuildEvent(
  state: Extract<ConversationState, { status: "building" }>,
  event: BuildEvent,
): ConversationState {
  const progress: BuildProgress = { ...state.progress };

  switch (event.type) {
    case "build.started":
      return state;

    case "section.started":
      progress[event.section] = { kind: "searching" };
      return { ...state, progress };

    case "section.provider":
      if (event.status === "searching") {
        progress[event.section] = { kind: "searching", provider: event.provider };
      }
      return { ...state, progress };

    case "section.partial": {
      progress[event.section] = {
        kind: "partial",
        results: event.results,
      };
      const partialQuote = {
        ...state.partialQuote,
        ...sectionItemsToPartialQuote(event.section, event.results),
      };
      return { ...state, progress, partialQuote };
    }

    case "section.done": {
      progress[event.section] = { kind: "done", results: event.results };
      const partialQuote = {
        ...state.partialQuote,
        ...sectionItemsToPartialQuote(event.section, event.results),
      };
      return { ...state, progress, partialQuote };
    }

    case "section.error":
      progress[event.section] = {
        kind: "error",
        error: event.error,
        skipped: event.skipped,
      };
      return { ...state, progress };

    case "build.done":
    case "build.error":
      return state;
  }
}

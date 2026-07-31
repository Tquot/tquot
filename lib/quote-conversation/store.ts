"use client";

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { nanoid } from "nanoid";
import {
  conversationReducer,
  initialState,
} from "@/lib/quote-conversation/state-machine";
import type {
  AssistantMessage,
  ConversationAction,
  ConversationState,
  Message,
  SystemEventType,
  SystemMessage,
} from "@/lib/quote-conversation/types";
import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import { syncQuotePricing } from "@/lib/quotes/build-quote";
import type { QuotePatch } from "@/lib/agent/types";
import { applyQuotePatch } from "@/lib/agent/apply-patch";
import type { Intent } from "@/lib/agent/intent";
import { classifyIntent } from "@/lib/agent/intent";
import { resolveInvalidation } from "@/lib/agent/invalidation";
import { tplRevisionAck } from "@/lib/agent/templates";
import type { RevisionKind } from "@/lib/agent/types";

interface HydrateFromSavedQuoteInput {
  quoteId: string;
  quote: Quote;
  tripInput: ParsedTripInput;
  resumeMessage?: string;
}

interface QuoteConversationStore {
  state: ConversationState;
  messages: Message[];
  /** Supabase quotes.id once the canvas quote has been persisted (Block E). */
  persistedQuoteId: string | null;
  /** Sugerencias descartadas en esta cotización (persisten con el quote). */
  dismissedSuggestions: string[];
  /** Revisión encolada si llega otra mientras se procesa una. No serializar. */
  _pendingRevision: Intent | null;
  _revising: boolean;

  dispatch: (action: ConversationAction) => void;

  addUserMessage: (content: string) => string;
  addAssistantMessage: (
    content: string,
    opts?: {
      streaming?: boolean;
      metadata?: AssistantMessage["metadata"];
    },
  ) => string;
  replaceAssistantMessage: (
    id: string,
    content: string,
    opts?: { streaming?: boolean },
  ) => void;
  appendToAssistantMessage: (id: string, delta: string) => void;
  finalizeAssistantMessage: (id: string) => void;
  addSystemEvent: (type: SystemEventType, payload?: Record<string, unknown>) => string;
  updateQuote: (quote: Quote) => void;
  setPersistedQuoteId: (quoteId: string | null) => void;
  hydrateFromSavedQuote: (input: HydrateFromSavedQuoteInput) => void;
  applyAgentPatch: (patch: QuotePatch) => Promise<void>;
  dismissSuggestion: (id: string) => void;
  /** Clasifica e intenta aplicar una revisión mid-build (coalescing). */
  enqueueRevisionFromMessage: (message: string) => Promise<void>;
  _applyRevisionIntent: (intent: Intent) => Promise<void>;

  reset: () => void;
  resetConversation: () => void;
}

export const useQuoteConversationStore = create<QuoteConversationStore>()(
  devtools(
    subscribeWithSelector((set) => ({
      state: initialState,
      messages: [],
      persistedQuoteId: null,
      dismissedSuggestions: [],
      _pendingRevision: null,
      _revising: false,

      dispatch: (action) =>
        set(
          (current) => ({ state: conversationReducer(current.state, action) }),
          false,
          `conversation/${action.type}`,
        ),

      addUserMessage: (content) => {
        const id = nanoid();
        set(
          (current) => ({
            messages: [
              ...current.messages,
              { id, role: "user", content, timestamp: Date.now() },
            ],
          }),
          false,
          "messages/addUser",
        );
        return id;
      },

      addAssistantMessage: (content, opts) => {
        const id = nanoid();
        const message: AssistantMessage = {
          id,
          role: "assistant",
          content,
          timestamp: Date.now(),
          streaming: opts?.streaming ?? false,
          metadata: opts?.metadata,
        };
        set(
          (current) => ({ messages: [...current.messages, message] }),
          false,
          "messages/addAssistant",
        );
        return id;
      },

      replaceAssistantMessage: (id, content, opts) =>
        set(
          (current) => ({
            messages: current.messages.map((message) =>
              message.id === id && message.role === "assistant"
                ? {
                    ...message,
                    content,
                    streaming: opts?.streaming ?? message.streaming,
                  }
                : message,
            ),
          }),
          false,
          "messages/replaceAssistant",
        ),

      appendToAssistantMessage: (id, delta) =>
        set(
          (current) => ({
            messages: current.messages.map((message) =>
              message.id === id && message.role === "assistant"
                ? { ...message, content: message.content + delta, streaming: true }
                : message,
            ),
          }),
          false,
          "messages/appendAssistant",
        ),

      finalizeAssistantMessage: (id) =>
        set(
          (current) => ({
            messages: current.messages.map((message) =>
              message.id === id && message.role === "assistant"
                ? { ...message, streaming: false }
                : message,
            ),
          }),
          false,
          "messages/finalizeAssistant",
        ),

      addSystemEvent: (type, payload = {}) => {
        const id = nanoid();
        const message: SystemMessage = {
          id,
          role: "system",
          type,
          payload,
          timestamp: Date.now(),
        };
        set(
          (current) => ({ messages: [...current.messages, message] }),
          false,
          "messages/addSystem",
        );
        return id;
      },

      updateQuote: (quote) => {
        syncQuotePricing(quote);
        set(
          (current) => {
            const next = conversationReducer(current.state, {
              type: "UPDATE_QUOTE",
              quote,
            });
            return { state: next };
          },
          false,
          "quote/update",
        );
      },

      setPersistedQuoteId: (quoteId) =>
        set({ persistedQuoteId: quoteId }, false, "quote/setPersistedId"),

      hydrateFromSavedQuote: ({ quoteId, quote, tripInput, resumeMessage }) => {
        const synced = { ...quote };
        syncQuotePricing(synced);
        const messages: Message[] = resumeMessage
          ? [
              {
                id: nanoid(),
                role: "assistant",
                content: resumeMessage,
                timestamp: Date.now(),
                streaming: false,
              },
            ]
          : [];

        const dismissed =
          (
            synced as Quote & {
              dismissedSuggestions?: string[];
            }
          ).dismissedSuggestions ?? [];

        set(
          {
            state: {
              status: "complete",
              parsed: tripInput,
              quote: synced,
            },
            messages,
            persistedQuoteId: quoteId,
            dismissedSuggestions: dismissed,
            _pendingRevision: null,
            _revising: false,
          },
          false,
          "quote/hydrateFromSaved",
        );
      },

      dismissSuggestion: (id) =>
        set(
          (current) => ({
            dismissedSuggestions: current.dismissedSuggestions.includes(id)
              ? current.dismissedSuggestions
              : [...current.dismissedSuggestions, id],
          }),
          false,
          "suggestions/dismiss",
        ),

      applyAgentPatch: async (patch) => {
        const current = useQuoteConversationStore.getState();
        const quote = current.state.status === "complete" ||
          current.state.status === "building" ||
          current.state.status === "refining" ||
          current.state.status === "awaiting_confirmation"
          ? ("quote" in current.state ? current.state.quote : null)
          : null;
        if (!quote && patch.type !== "dismissSuggestion") return;

        const result = applyQuotePatch(
          quote ?? {
            id: "empty",
            summary: {
              route: "",
              durationDays: 0,
              passengers: { adults: 0, children: 0, total: 0 },
            },
            flights: [],
            hotels: [],
            experiences: [],
            transfers: [],
            pricing: {
              baseTotal: 0,
              margin: 0,
              finalTotal: 0,
              currency: "EUR",
            },
            _meta: {
              flightsSource: "mock",
              hotelsSource: "mock",
              experiencesSource: "mock",
              transfersSource: "mock",
            },
          },
          current.dismissedSuggestions,
          patch,
        );

        set(
          { dismissedSuggestions: result.dismissed },
          false,
          "suggestions/patchDismissed",
        );

        if (quote) {
          current.updateQuote(result.quote);
        }

        if (result.message) {
          current.addAssistantMessage(result.message, {
            metadata: { agentKind: "revision_ack" },
          });
        }

        // Persist dismissals when we have a quote id (best-effort).
        if (
          patch.type === "dismissSuggestion" &&
          current.persistedQuoteId
        ) {
          try {
            await fetch("/api/quotes/dismiss-suggestion", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                quoteId: current.persistedQuoteId,
                suggestionId: patch.id,
              }),
            });
          } catch {
            // offline / not yet migrated — dismissals still live in memory
          }
        }
      },

      enqueueRevisionFromMessage: async (message) => {
        const intent = classifyIntent(message);
        await useQuoteConversationStore.getState()._applyRevisionIntent(intent);
      },

      _applyRevisionIntent: async (intent: Intent) => {
        const current = useQuoteConversationStore.getState();

        if (current._revising) {
          set({ _pendingRevision: intent }, false, "revision/enqueue");
          return;
        }

        set({ _revising: true }, false, "revision/start");

        try {
          if (intent.type === "revise_params") {
            const { rebuild } = resolveInvalidation(intent.changes);
            const field = intent.changes[0]?.field;
            const kind: RevisionKind =
              field === "adults" || field === "children"
                ? "pax"
                : field === "nights" ||
                    field === "dates" ||
                    field === "destination" ||
                    field === "board" ||
                    field === "category" ||
                    field === "budget"
                  ? field
                  : "dates";
            const detail =
              field === "nights"
                ? `${intent.changes[0]?.value} noches`
                : String(intent.changes[0]?.value ?? "");
            const ack = tplRevisionAck(kind, detail, rebuild);
            current.addAssistantMessage(ack, {
              metadata: { agentKind: "revision_ack" },
            });
          }
        } finally {
          const pending =
            useQuoteConversationStore.getState()._pendingRevision;
          set(
            { _revising: false, _pendingRevision: null },
            false,
            "revision/done",
          );
          if (pending) {
            await useQuoteConversationStore
              .getState()
              ._applyRevisionIntent(pending);
          }
        }
      },

      reset: () =>
        set(
          {
            state: initialState,
            messages: [],
            persistedQuoteId: null,
            dismissedSuggestions: [],
            _pendingRevision: null,
            _revising: false,
          },
          false,
          "store/reset",
        ),

      /** Alias used by embedded onboarding to clear demo state on unmount. */
      resetConversation: () =>
        set(
          {
            state: initialState,
            messages: [],
            persistedQuoteId: null,
            dismissedSuggestions: [],
            _pendingRevision: null,
            _revising: false,
          },
          false,
          "store/resetConversation",
        ),
    })),
    { name: "quote-conversation" },
  ),
);

export const selectStatus = (store: QuoteConversationStore) => store.state.status;

export const selectMessages = (store: QuoteConversationStore) => store.messages;

export const selectBuildProgress = (store: QuoteConversationStore) =>
  store.state.status === "building" ? store.state.progress : null;

export const selectCurrentQuote = (store: QuoteConversationStore) => {
  switch (store.state.status) {
    case "complete":
    case "planning_refinement":
    case "awaiting_confirmation":
    case "refining":
      return store.state.quote;
    case "building":
      return store.state.partialQuote;
    default:
      return null;
  }
};

export const selectError = (store: QuoteConversationStore) =>
  store.state.status === "error" ? store.state.error : null;

export const selectActivePlan = (store: QuoteConversationStore) =>
  store.state.status === "awaiting_confirmation" ? store.state.plan : null;

export const selectIsAwaitingConfirmation = (store: QuoteConversationStore) =>
  store.state.status === "awaiting_confirmation";

export const selectIsPlanningRefinement = (store: QuoteConversationStore) =>
  store.state.status === "planning_refinement";

export const selectIsLocked = (store: QuoteConversationStore) =>
  store.state.status === "parsing" ||
  store.state.status === "building" ||
  store.state.status === "refining";

export const selectNeedsInput = (store: QuoteConversationStore) =>
  store.state.status === "needs_input" ? store.state : null;

export const selectAwaitingAirports = (store: QuoteConversationStore) =>
  store.state.status === "awaiting_airports" ? store.state : null;

export const selectParsedTripInput = (store: QuoteConversationStore) => {
  switch (store.state.status) {
    case "building":
      return store.state.parsed;
    case "complete":
    case "planning_refinement":
    case "awaiting_confirmation":
    case "refining":
      return store.state.parsed;
    default:
      return null;
  }
};

export const selectParsingPartial = (store: QuoteConversationStore) =>
  store.state.status === "parsing" ? store.state.partial : null;

export type { QuoteConversationStore };

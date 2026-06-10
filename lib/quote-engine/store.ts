"use client";

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { nanoid } from "nanoid";
import {
  conversationReducer,
  initialState,
} from "@/lib/quote-engine/reducer";
import type {
  AssistantMessage,
  ConversationAction,
  ConversationState,
  Message,
  SystemEventType,
  SystemMessage,
} from "@/lib/quote-engine/types";
import type { Quote } from "@/lib/quotes/build-quote";
import { syncQuotePricing } from "@/lib/quotes/build-quote";

export interface QuoteConversationStore {
  state: ConversationState;
  messages: Message[];

  dispatch: (action: ConversationAction) => void;
  addUserMessage: (content: string) => string;
  addAssistantMessage: (
    content: string,
    opts?: { streaming?: boolean },
  ) => string;
  updateAssistantMessage: (
    id: string,
    content: string,
    opts?: { streaming?: boolean },
  ) => void;
  addSystemEvent: (
    type: SystemEventType,
    payload?: Record<string, unknown>,
  ) => string;
  updateQuote: (quote: Quote) => void;
  reset: () => void;
}

export const useQuoteConversationStore = create<QuoteConversationStore>()(
  devtools(
    subscribeWithSelector((set) => ({
      state: initialState,
      messages: [],

      dispatch: (action) =>
        set(
          (current) => ({
            state: conversationReducer(current.state, action),
          }),
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
        };
        set(
          (current) => ({
            messages: [...current.messages, message],
          }),
          false,
          "messages/addAssistant",
        );
        return id;
      },

      updateAssistantMessage: (id, content, opts) =>
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
          "messages/updateAssistant",
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
          (current) => ({
            messages: [...current.messages, message],
          }),
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

      reset: () =>
        set({ state: initialState, messages: [] }, false, "store/reset"),
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
    case "refining":
      return store.state.quote;
    case "building":
      return store.state.partialQuote;
    default:
      return null;
  }
};

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
    case "refining":
      return store.state.parsed;
    default:
      return null;
  }
};

export const selectParsingPartial = (store: QuoteConversationStore) =>
  store.state.status === "parsing" ? store.state.partial : null;

export const selectError = (store: QuoteConversationStore) =>
  store.state.status === "error" ? store.state.error : null;

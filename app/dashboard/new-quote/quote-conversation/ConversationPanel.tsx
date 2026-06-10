"use client";

import { useEffect, useRef, useState } from "react";
import { AirportPicker } from "@/components/AirportPicker";
import type { Message } from "@/lib/quote-engine/types";
import {
  airportChoicesForBuild,
  isAirportSelectionComplete,
  type AirportChoicesState,
} from "@/lib/quote-engine/airport-selection";
import type { EnrichedTripRequest } from "@/lib/parser/airport-resolution";
import { useDashboardLanguage } from "../../dashboard-language-provider";
import { MessageBubble } from "./MessageBubble";

type ConversationPanelProps = {
  messages: Message[];
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSubmit: () => void;
  isLocked: boolean;
  status: string;
  needsInput: {
    questions: string[];
    partial: Record<string, unknown>;
    input: string;
  } | null;
  awaitingAirports: {
    input: string;
    parsed: { enrichedTrip?: EnrichedTripRequest };
  } | null;
  onConfirmAirports: (choices: {
    origin: string | "all";
    destination: string | "all";
  }) => void;
};

export function ConversationPanel({
  messages,
  chatInput,
  onChatInputChange,
  onSubmit,
  isLocked,
  status,
  needsInput,
  awaitingAirports,
  onConfirmAirports,
}: ConversationPanelProps) {
  const { t } = useDashboardLanguage();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [airportChoices, setAirportChoices] = useState<AirportChoicesState>({
    origin: null,
    destination: null,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, needsInput, awaitingAirports]);

  useEffect(() => {
    if (!awaitingAirports) {
      setAirportChoices({ origin: null, destination: null });
    }
  }, [awaitingAirports]);

  const placeholder =
    status === "complete"
      ? t.chatPlaceholder
      : status === "needs_input"
        ? t.parserQuestionsHint
        : t.quoteEngineRequestPlaceholder;

  const enriched = awaitingAirports?.parsed.enrichedTrip;
  const airportComplete =
    enriched && isAirportSelectionComplete(enriched, airportChoices);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {needsInput ? (
          <div
            className="mx-2 rounded-xl border border-tquot-warm/30 bg-amber-50 p-4"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-semibold text-amber-900">
              {t.chipParserNeedsDetails}
            </p>
            <p className="mt-1 text-xs text-amber-800/80">{t.parserQuestionsHint}</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-tquot-text">
              {needsInput.questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {awaitingAirports && enriched ? (
          <div className="mx-2 space-y-4 rounded-xl border border-tquot-border bg-tquot-surface p-4">
            {enriched._resolved.origin?.needsAgentChoice ? (
              <AirportPicker
                label={t.origin}
                resolved={enriched._resolved.origin}
                onSelect={(iata) =>
                  setAirportChoices((current) => ({ ...current, origin: iata }))
                }
              />
            ) : null}
            {enriched._resolved.destination?.needsAgentChoice ? (
              <AirportPicker
                label={t.destination}
                resolved={enriched._resolved.destination}
                onSelect={(iata) =>
                  setAirportChoices((current) => ({
                    ...current,
                    destination: iata,
                  }))
                }
              />
            ) : null}
            <button
              type="button"
              disabled={!airportComplete}
              onClick={() => {
                if (!enriched) return;
                onConfirmAirports(airportChoicesForBuild(enriched, airportChoices));
              }}
              className="w-full rounded-xl bg-tquot-teal px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.generateQuote}
            </button>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-tquot-border bg-tquot-surface p-4">
        <textarea
          value={chatInput}
          onChange={(event) => onChatInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLocked || Boolean(awaitingAirports)}
          rows={4}
          placeholder={placeholder}
          className="w-full resize-y rounded-xl border border-tquot-border bg-slate-50/50 px-4 py-3 text-sm text-tquot-text placeholder:text-tquot-muted/60 outline-none focus:border-tquot-accent focus:ring-2 focus:ring-tquot-accent/20 disabled:opacity-50"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-tquot-muted">⌘/Ctrl + Enter</p>
          <button
            type="button"
            onClick={onSubmit}
            disabled={
              isLocked || !chatInput.trim() || Boolean(awaitingAirports)
            }
            className="rounded-xl bg-tquot-teal px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLocked ? t.processing : t.send}
          </button>
        </div>
      </div>
    </div>
  );
}

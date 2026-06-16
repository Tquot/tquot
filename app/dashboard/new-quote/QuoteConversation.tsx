"use client";

import { useEffect, useMemo, useState } from "react";
import { saveQuoteWithClient } from "@/app/actions/quotes";
import { useConversation } from "@/lib/quote-engine/hooks";
import { useQuoteConversationStore } from "@/lib/quote-engine/store";
import type { Quote } from "@/lib/quotes/build-quote";
import { useDashboardLanguage } from "../dashboard-language-provider";
import { ConversationHeader } from "./quote-conversation/ConversationHeader";
import { ConversationPanel } from "./quote-conversation/ConversationPanel";
import { QuoteCanvas } from "./quote-conversation/QuoteCanvas";
import { HotelCompareModal } from "@/components/quote-canvas/HotelCompareModal";
import type { CompareHotelState } from "./quote-comparator";
import {
  generateAgentPDF,
  generateClientPDF,
  openServerPdf,
} from "./quote-pdf";
import { useQuoteItemHandlers } from "./use-quote-item-handlers";

function isCompleteQuote(quote: Partial<Quote> | Quote | null): quote is Quote {
  return Boolean(quote && quote.pricing && quote.summary && quote.id);
}

export function QuoteConversation() {
  const { locale, t } = useDashboardLanguage();
  const {
    status,
    messages,
    isLocked,
    isParsing,
    isBuilding,
    isRefining,
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
    retry,
    reset,
  } = useConversation();

  const addAssistantMessage = useQuoteConversationStore(
    (store) => store.addAssistantMessage,
  );

  const [chatInput, setChatInput] = useState("");
  const [agentNotes, setAgentNotes] = useState(t.defaultAgentNotes);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [compareHotel, setCompareHotel] = useState<CompareHotelState>(null);

  const completeQuote = isCompleteQuote(quote) ? quote : null;

  useEffect(() => {
    if (messages.length > 0) return;

    const welcomeTimer = window.setTimeout(() => {
      if (useQuoteConversationStore.getState().messages.length === 0) {
        addAssistantMessage(t.chatWelcome);
      }
    }, 0);

    return () => window.clearTimeout(welcomeTimer);
  }, [addAssistantMessage, messages.length, t.chatWelcome]);

  useEffect(() => {
    setAgentNotes(t.defaultAgentNotes);
  }, [t.defaultAgentNotes]);

  const handlers = useQuoteItemHandlers({
    quote: completeQuote,
    tripInput: parsedTripInput,
    updateQuote,
    setCompareHotel,
    compareHotel,
    t,
  });

  function handleSubmit() {
    const trimmed = chatInput.trim();
    if (!trimmed || isLocked) return;

    if (status === "complete") {
      void submitRefinement(trimmed);
    } else if (status === "needs_input" && needsInput) {
      const combined = `${needsInput.input}\n\nRespuestas:\n${trimmed}`;
      submitInitialRequest(combined);
    } else if (status === "idle" || status === "error") {
      submitInitialRequest(trimmed);
    }

    setChatInput("");
  }

  async function persistCurrentQuote(): Promise<string | null> {
    if (!completeQuote || !parsedTripInput) {
      return null;
    }

    setIsSavingQuote(true);
    try {
      const result = await saveQuoteWithClient({
        quote: completeQuote,
        tripInput: parsedTripInput,
        agentNotes: agentNotes || undefined,
        client: { kind: "skip" },
      });
      setSavedQuoteId(result.quoteId);
      return result.quoteId;
    } catch (error) {
      console.error("[persistCurrentQuote] error", error);
      return null;
    } finally {
      setIsSavingQuote(false);
    }
  }

  function handleQuoteSaved(result: { quoteId: string; clientId: string | null }) {
    setSavedQuoteId(result.quoteId);
    openServerPdf(result.quoteId, "client");
  }

  async function handleAgentPdf() {
    const quoteId = await persistCurrentQuote();
    if (quoteId) {
      openServerPdf(quoteId, "agent");
      return;
    }
    if (completeQuote) {
      generateAgentPDF({ quote: completeQuote, locale, t, agentNotes });
    }
  }

  async function handleClientPdf() {
    const quoteId = await persistCurrentQuote();
    if (quoteId) {
      openServerPdf(quoteId, "client");
      return;
    }
    if (completeQuote) {
      generateClientPDF({ quote: completeQuote, locale, t });
    }
  }

  function handleReset() {
    reset();
    setChatInput("");
    setSavedQuoteId(null);
    setCompareHotel(null);
  }

  const headerQuote = useMemo(
    () => (completeQuote ?? (quote as Partial<Quote> | null)),
    [completeQuote, quote],
  );

  return (
    <div className="flex min-h-screen flex-col bg-tquot-bg text-tquot-text">
      <ConversationHeader
        quote={headerQuote}
        tripInput={parsedTripInput}
        agentNotes={agentNotes}
        isSavingQuote={isSavingQuote}
        onReset={handleReset}
        onQuoteSaved={handleQuoteSaved}
        onAgentPdf={() => void handleAgentPdf()}
        onClientPdf={() => void handleClientPdf()}
      />

      {error ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
          <p>{error.message}</p>
          {error.recoverable ? (
            <button
              type="button"
              onClick={retry}
              className="mt-2 font-semibold text-tquot-teal underline"
            >
              {t.statusReady}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="flex min-h-[42vh] flex-col border-b border-tquot-border bg-white lg:min-h-0 lg:w-2/5 lg:border-b-0 lg:border-r">
          <ConversationPanel
            messages={messages}
            chatInput={chatInput}
            onChatInputChange={setChatInput}
            onSubmit={handleSubmit}
            isLocked={isLocked || isRefining}
            status={status}
            needsInput={needsInput}
            awaitingAirports={awaitingAirports}
            onConfirmAirports={confirmAirports}
          />
        </aside>

        <main className="min-h-[50vh] flex-1 bg-tquot-surface lg:min-h-0 lg:w-3/5">
          <QuoteCanvas
            status={status}
            parsingPartial={parsingPartial}
            buildProgress={buildProgress}
            quote={quote}
            isBuilding={isBuilding || isParsing}
            handlers={handlers}
          />
        </main>
      </div>

      {completeQuote && compareHotel && parsedTripInput ? (
        <HotelCompareModal
          open
          hotel={compareHotel.hotel}
          searchContext={{
            destination: parsedTripInput.destination,
            checkIn: parsedTripInput.dates.start,
            checkOut: parsedTripInput.dates.end,
            guests: [
              {
                adults: completeQuote.summary.passengers.adults,
                children: completeQuote.summary.passengers.children || undefined,
              },
            ],
          }}
          additionalProviders={["hotelbeds", "booking", "expedia"]}
          onClose={() => setCompareHotel(null)}
          onHotelRefreshed={handlers.handleHotelRefreshed}
        />
      ) : null}

      {completeQuote ? (
        <div className="border-t border-tquot-border bg-tquot-surface px-4 py-3 sm:px-6">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tquot-muted">
            {t.agentNotes}
          </label>
          <textarea
            value={agentNotes}
            onChange={(event) => setAgentNotes(event.target.value)}
            rows={2}
            className="w-full rounded-xl border border-tquot-border bg-tquot-bg px-3 py-2 text-sm outline-none focus:border-tquot-accent focus:ring-2 focus:ring-tquot-accent/20"
          />
        </div>
      ) : null}
    </div>
  );
}

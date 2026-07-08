"use client";

import { useEffect, useMemo, useState } from "react";
import { saveQuoteWithClient } from "@/app/actions/quotes";
import { useQuoteConversation } from "@/hooks/useQuoteConversation";
import { BookingConfigProvider } from "@/lib/booking-handoff/context";
import type { AgencyBookingConfig } from "@/lib/booking-handoff/types";
import { useQuoteConversationStore } from "@/lib/quote-conversation/store";
import type { Quote } from "@/lib/quotes/build-quote";
import type { Quote as EngineQuote } from "@/lib/quote-engine/types";
import { useDashboardLanguage } from "../dashboard-language-provider";
import { ConversationHeader } from "./quote-conversation/ConversationHeader";
import { ConversationPanel } from "@/components/quote-conversation/conversation/ConversationPanel";
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

type QuoteConversationProps = {
  agencyConfig: AgencyBookingConfig;
};

export function QuoteConversation({ agencyConfig }: QuoteConversationProps) {
  const { locale, t } = useDashboardLanguage();
  const {
    status,
    messages,
    isParsing,
    isBuilding,
    error,
    parsingPartial,
    buildProgress,
    quote,
    parsedTripInput,
    updateQuote,
    retry,
    reset,
  } = useQuoteConversation();

  const addAssistantMessage = useQuoteConversationStore(
    (store) => store.addAssistantMessage,
  );

  const [agentNotes, setAgentNotes] = useState(t.defaultAgentNotes);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [compareHotel, setCompareHotel] = useState<CompareHotelState>(null);

  const completeQuote = isCompleteQuote(quote) ? quote : null;
  const completeQuoteWithGroup = completeQuote as EngineQuote | null;

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
    } catch (persistError) {
      console.error("[persistCurrentQuote] error", persistError);
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
    if (completeQuoteWithGroup?.group) {
      // Para cotizaciones de grupo usamos PDF en memoria (la info de grupo
      // no está persistida en Supabase en este MVP).
      generateAgentPDF({ quote: completeQuoteWithGroup, locale, t, agentNotes });
      return;
    }

    const quoteId = await persistCurrentQuote();
    if (quoteId) openServerPdf(quoteId, "agent");
  }

  async function handleClientPdf() {
    if (completeQuoteWithGroup?.group) {
      generateClientPDF({ quote: completeQuoteWithGroup, locale, t });
      return;
    }

    const quoteId = await persistCurrentQuote();
    if (quoteId) openServerPdf(quoteId, "client");
  }

  function handleReset() {
    reset();
    setSavedQuoteId(null);
    setCompareHotel(null);
  }

  const headerQuote = useMemo(
    () => (completeQuote ?? (quote as Partial<Quote> | null)),
    [completeQuote, quote],
  );

  return (
    <BookingConfigProvider config={agencyConfig}>
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
          <ConversationPanel />
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
    </BookingConfigProvider>
  );
}

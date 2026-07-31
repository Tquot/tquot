"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { saveQuoteWithClient } from "@/app/actions/quotes";
import { useQuoteConversation } from "@/hooks/useQuoteConversation";
import { BookingConfigProvider } from "@/lib/booking-handoff/context";
import type { AgencyBookingConfig } from "@/lib/booking-handoff/types";
import { AccessibilityProfileProvider } from "@/components/accessibility/AccessibilityProfileContext";
import { useQuoteConversationStore } from "@/lib/quote-conversation/store";
import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
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
import { buildDemoParsedForStore } from "@/lib/onboarding/demo-parsed";
import { setQuoteDemoFlag, isQuoteDemoBuild } from "@/lib/onboarding/demo-flag";

function isCompleteQuote(quote: Partial<Quote> | Quote | null): quote is Quote {
  return Boolean(quote && quote.pricing && quote.summary && quote.id);
}

type QuoteConversationProps = {
  agencyConfig: AgencyBookingConfig;
  prefillText?: string;
  prefillClient?: { id: string; name: string; email?: string };
  initialResume?: {
    quoteId: string;
    quote: Quote;
    tripInput: ParsedTripInput;
  };
  /** Onboarding: one-column layout without ConversationHeader chrome. */
  embedded?: boolean;
  /** Pass demo:true to the build stream (zero Claude / providers). */
  demo?: boolean;
  /** Prefill the composer; with autoStart, used as the first user message. */
  initialMessage?: string;
  /** Auto-submit initialMessage (or demo build) on mount. */
  autoStart?: boolean;
};

export function QuoteConversation({
  agencyConfig,
  prefillText,
  prefillClient,
  initialResume,
  embedded = false,
  demo = false,
  initialMessage,
  autoStart = false,
}: QuoteConversationProps) {
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
    submitInitialRequest,
  } = useQuoteConversation();

  const addAssistantMessage = useQuoteConversationStore(
    (store) => store.addAssistantMessage,
  );
  const dispatch = useQuoteConversationStore((store) => store.dispatch);
  const persistedQuoteId = useQuoteConversationStore(
    (store) => store.persistedQuoteId,
  );
  const setPersistedQuoteId = useQuoteConversationStore(
    (store) => store.setPersistedQuoteId,
  );
  const hydrateFromSavedQuote = useQuoteConversationStore(
    (store) => store.hydrateFromSavedQuote,
  );
  const resetConversation = useQuoteConversationStore(
    (store) => store.resetConversation,
  );

  const [agentNotes, setAgentNotes] = useState(t.defaultAgentNotes);
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [compareHotel, setCompareHotel] = useState<CompareHotelState>(null);
  const hydratedResumeRef = useRef<string | null>(null);
  const autoStartedRef = useRef(false);
  const savedQuoteId = persistedQuoteId;

  useLayoutEffect(() => {
    setQuoteDemoFlag(demo);
    return () => setQuoteDemoFlag(false);
  }, [demo]);

  const completeQuote = isCompleteQuote(quote) ? quote : null;
  const completeQuoteWithGroup = completeQuote as EngineQuote | null;

  useEffect(() => {
    return () => {
      if (embedded) resetConversation();
    };
  }, [embedded, resetConversation]);

  useEffect(() => {
    if (!initialResume) return;
    if (hydratedResumeRef.current === initialResume.quoteId) return;
    hydratedResumeRef.current = initialResume.quoteId;
    hydrateFromSavedQuote({
      quoteId: initialResume.quoteId,
      quote: initialResume.quote,
      tripInput: initialResume.tripInput,
      resumeMessage:
        "Cotización retomada. Puedes seguir refinando vuelos, hoteles o márgenes desde aquí.",
    });
  }, [hydrateFromSavedQuote, initialResume]);

  useEffect(() => {
    if (initialResume) return;
    if (messages.length > 0) return;
    if (autoStart) return;

    const welcomeTimer = window.setTimeout(() => {
      if (useQuoteConversationStore.getState().messages.length === 0) {
        addAssistantMessage(t.chatWelcome);
      }
    }, 0);

    return () => window.clearTimeout(welcomeTimer);
  }, [
    addAssistantMessage,
    initialResume,
    messages.length,
    t.chatWelcome,
    autoStart,
  ]);

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || initialResume) return;
    autoStartedRef.current = true;

    const message = (initialMessage ?? prefillText ?? "").trim();
    if (demo) {
      // Skip Claude parser: jump straight to demo build stream.
      if (message) {
        useQuoteConversationStore.getState().addUserMessage(message);
      }
      dispatch({
        type: "PARSE_COMPLETE",
        parsed: buildDemoParsedForStore(),
      });
      return;
    }

    if (message) {
      submitInitialRequest(message);
    }
  }, [
    autoStart,
    demo,
    dispatch,
    initialMessage,
    initialResume,
    prefillText,
    submitInitialRequest,
  ]);

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
    persistedQuoteId: savedQuoteId,
  });

  async function persistCurrentQuote(): Promise<string | null> {
    if (!completeQuote || !parsedTripInput) {
      console.log("[PDF] persistCurrentQuote skipped", {
        hasQuote: Boolean(completeQuote),
        hasTripInput: Boolean(parsedTripInput),
      });
      return null;
    }

    setIsSavingQuote(true);
    try {
      const result = await saveQuoteWithClient({
        quote: completeQuote,
        tripInput: parsedTripInput,
        agentNotes: agentNotes || undefined,
        client: prefillClient
          ? { kind: "existing", id: prefillClient.id }
          : { kind: "skip" },
        existingQuoteId: savedQuoteId ?? undefined,
      });
      console.log("[PDF] persistCurrentQuote result:", result);
      setPersistedQuoteId(result.quoteId);
      return result.quoteId;
    } catch (persistError) {
      console.error("[persistCurrentQuote] error", persistError);
      return null;
    } finally {
      setIsSavingQuote(false);
    }
  }

  function handleQuoteSaved(result: { quoteId: string; clientId: string | null }) {
    setPersistedQuoteId(result.quoteId);
    openServerPdf(result.quoteId, "client");
  }

  async function handleAgentPdf() {
    console.log("[PDF] handleAgentPdf called, savedQuoteId:", savedQuoteId);
    if (completeQuoteWithGroup?.group) {
      // Para cotizaciones de grupo usamos PDF en memoria (la info de grupo
      // no está persistida en Supabase en este MVP).
      generateAgentPDF({ quote: completeQuoteWithGroup, locale, t, agentNotes });
      return;
    }

    const quoteId = await persistCurrentQuote();
    console.log("[PDF] handleAgentPdf quoteId:", quoteId);
    if (quoteId) openServerPdf(quoteId, "agent");
  }

  async function handleClientPdf() {
    console.log("[PDF] handleClientPdf called, savedQuoteId:", savedQuoteId);
    if (completeQuoteWithGroup?.group) {
      generateClientPDF({ quote: completeQuoteWithGroup, locale, t });
      return;
    }

    const quoteId = await persistCurrentQuote();
    console.log("[PDF] handleClientPdf quoteId:", quoteId);
    if (quoteId) openServerPdf(quoteId, "client");
  }

  function handleReset() {
    reset();
    setPersistedQuoteId(null);
    setCompareHotel(null);
  }

  const headerQuote = useMemo(
    () => (completeQuote ?? (quote as Partial<Quote> | null)),
    [completeQuote, quote],
  );

  return (
    <BookingConfigProvider config={agencyConfig}>
    <AccessibilityProfileProvider
      initial={parsedTripInput?.preferences?.accessibilityProfile}
    >
    <div
      className={
        embedded
          ? "flex min-h-[640px] flex-col bg-paper text-text"
          : "flex h-[calc(100vh-0px)] min-h-screen flex-col bg-paper text-text"
      }
    >
      {embedded ? null : (
        <ConversationHeader
          quote={headerQuote}
          tripInput={parsedTripInput}
          agentNotes={agentNotes}
          isSavingQuote={isSavingQuote}
          savedQuoteId={savedQuoteId}
          prefillClient={prefillClient}
          onReset={handleReset}
          onQuoteSaved={handleQuoteSaved}
          onAgentPdf={() => void handleAgentPdf()}
          onClientPdf={() => void handleClientPdf()}
        />
      )}

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

      <div
        className={
          embedded
            ? "grid min-h-0 flex-1 grid-cols-1 overflow-hidden"
            : "grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[400px_1fr]"
        }
      >
        <aside
          className={
            embedded
              ? "flex max-h-[280px] flex-col border-b border-border-1 bg-paper"
              : "flex min-h-[42vh] flex-col border-b border-border-1 bg-paper lg:min-h-0 lg:border-b-0 lg:border-r"
          }
        >
          <ConversationPanel prefillText={prefillText ?? initialMessage} />
        </aside>

        <main
          id="quote-canvas"
          className="min-h-[50vh] overflow-y-auto bg-paper-2 lg:min-h-0"
        >
          <div className="mx-auto max-w-[720px] space-y-6 p-6">
            <QuoteCanvas
              status={status}
              parsingPartial={parsingPartial}
              buildProgress={buildProgress}
              quote={quote}
              isBuilding={isBuilding || isParsing}
              handlers={handlers}
            />
          </div>
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

      {completeQuote && !embedded ? (
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
    </AccessibilityProfileProvider>
    </BookingConfigProvider>
  );
}

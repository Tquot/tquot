"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ShareLinkButton } from "@/components/quote-detail/ShareLinkButton";
import { StatusSelector } from "@/components/quote-detail/StatusSelector";
import { VersionHistoryModal } from "@/components/quote-detail/VersionHistoryModal";
import type { QuoteStatus } from "@/lib/quote-status/transitions";
import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useDashboardLanguage } from "../../dashboard-language-provider";
import { formatMessage } from "../../format-message";
import { LocaleToggleButtons } from "../../locale-toggle-buttons";
import { ClientSaveForm } from "./ClientSaveForm";

type ConversationHeaderProps = {
  quote: Partial<Quote> | Quote | null;
  tripInput: ParsedTripInput | null;
  agentNotes?: string;
  isSavingQuote: boolean;
  savedQuoteId: string | null;
  onReset: () => void;
  onQuoteSaved: (result: { quoteId: string; clientId: string | null }) => void;
  onAgentPdf: () => void;
  onClientPdf: () => void;
};

export function ConversationHeader({
  quote,
  tripInput,
  agentNotes,
  isSavingQuote,
  savedQuoteId,
  onReset,
  onQuoteSaved,
  onAgentPdf,
  onClientPdf,
}: ConversationHeaderProps) {
  const { locale, t } = useDashboardLanguage();
  const completeQuote =
    quote && "pricing" in quote && quote.pricing ? (quote as Quote) : null;

  const [clientSaveModalOpen, setClientSaveModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>("draft");

  useEffect(() => {
    if (!savedQuoteId) {
      setQuoteStatus("draft");
      return;
    }

    let cancelled = false;
    void (async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from("quotes")
        .select("status")
        .eq("id", savedQuoteId)
        .maybeSingle();
      if (!cancelled && data?.status) {
        setQuoteStatus(data.status as QuoteStatus);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [savedQuoteId]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-tquot-border bg-tquot-surface/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="mb-2 inline-flex text-sm text-tquot-muted hover:text-tquot-accent"
            >
              ← {t.backToDashboard}
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-black text-tquot-text sm:text-2xl">
                {completeQuote ? t.compiledQuote : t.newQuote}
              </h1>
              <LocaleToggleButtons />
            </div>
            {completeQuote ? (
              <>
                <p className="mt-1 font-mono text-xs text-tquot-teal">
                  {completeQuote.id}
                </p>
                <p className="mt-1 text-sm font-semibold text-tquot-text">
                  {completeQuote.summary.route}
                </p>
                <p className="text-xs text-tquot-muted">
                  {formatMessage(
                    locale === "es"
                      ? "{days} días · {travelers} viajeros"
                      : "{days} days · {travelers} travelers",
                    {
                      days: completeQuote.summary.durationDays,
                      travelers: completeQuote.summary.passengers.total,
                    },
                  )}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-tquot-muted">
                {t.quoteEngineSubtitle}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onReset}
              className="rounded-xl border border-tquot-border bg-tquot-surface px-4 py-2.5 text-sm font-semibold text-tquot-text hover:bg-tquot-bg"
            >
              {t.newQuote}
            </button>
            <button
              type="button"
              onClick={() => setClientSaveModalOpen(true)}
              disabled={!completeQuote || !tripInput || isSavingQuote}
              className="rounded-xl border border-tquot-teal/30 bg-tquot-teal/10 px-4 py-2.5 text-sm font-semibold text-tquot-teal disabled:opacity-50"
            >
              {isSavingQuote ? t.savingQuote : t.saveAndGeneratePdf}
            </button>
            <button
              type="button"
              onClick={onAgentPdf}
              disabled={!completeQuote || isSavingQuote}
              className="rounded-xl border border-tquot-teal/30 bg-tquot-teal/10 px-4 py-2.5 text-sm font-semibold text-tquot-teal disabled:opacity-50"
            >
              {isSavingQuote ? t.savingQuote : t.pdfAgent}
            </button>
            <button
              type="button"
              onClick={onClientPdf}
              disabled={!completeQuote || isSavingQuote}
              className="rounded-xl bg-tquot-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {isSavingQuote ? t.savingQuote : t.pdfClient}
            </button>
          </div>
        </div>

        {savedQuoteId ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-tquot-border/60 pt-3">
            <StatusSelector
              quoteId={savedQuoteId}
              currentStatus={quoteStatus}
              onStatusChange={setQuoteStatus}
            />
            <ShareLinkButton quoteId={savedQuoteId} />
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="rounded-xl border border-tquot-border bg-tquot-surface px-4 py-2 text-sm font-semibold text-tquot-text hover:bg-tquot-bg"
            >
              Ver historial
            </button>
          </div>
        ) : null}
      </header>

      <Modal
        open={clientSaveModalOpen}
        onClose={() => setClientSaveModalOpen(false)}
        title={t.clientSaveModalTitle}
        size="md"
      >
        {completeQuote && tripInput ? (
          <ClientSaveForm
            quote={completeQuote}
            tripInput={tripInput}
            agentNotes={agentNotes}
            existingQuoteId={savedQuoteId}
            onSaved={(result) => {
              setClientSaveModalOpen(false);
              onQuoteSaved(result);
            }}
            onClose={() => setClientSaveModalOpen(false)}
          />
        ) : null}
      </Modal>

      {historyOpen && savedQuoteId ? (
        <VersionHistoryModal
          quoteId={savedQuoteId}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}
    </>
  );
}

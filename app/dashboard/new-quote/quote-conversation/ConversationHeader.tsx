"use client";

import Link from "next/link";
import { useState } from "react";
import type { Quote } from "@/lib/quotes/build-quote";
import { useDashboardLanguage } from "../../dashboard-language-provider";
import { formatMessage } from "../../format-message";
import { LocaleToggleButtons } from "../../locale-toggle-buttons";

type ClientSaveOptions = {
  clientName: string;
  clientEmail?: string;
};

type ConversationHeaderProps = {
  quote: Partial<Quote> | Quote | null;
  isSavingQuote: boolean;
  onReset: () => void;
  onSaveClientPdf: (client?: ClientSaveOptions) => void;
  onAgentPdf: () => void;
  onClientPdf: () => void;
};

export function ConversationHeader({
  quote,
  isSavingQuote,
  onReset,
  onSaveClientPdf,
  onAgentPdf,
  onClientPdf,
}: ConversationHeaderProps) {
  const { locale, t } = useDashboardLanguage();
  const completeQuote =
    quote && "pricing" in quote && quote.pricing ? (quote as Quote) : null;

  const [clientSaveModalOpen, setClientSaveModalOpen] = useState(false);
  const [modalClientName, setModalClientName] = useState("");
  const [modalClientEmail, setModalClientEmail] = useState("");

  function openClientSaveModal() {
    setModalClientName("");
    setModalClientEmail("");
    setClientSaveModalOpen(true);
  }

  function closeClientSaveModal() {
    setClientSaveModalOpen(false);
  }

  function handleConfirmSave() {
    const name = modalClientName.trim();
    if (!name) return;

    closeClientSaveModal();
    onSaveClientPdf({
      clientName: name,
      clientEmail: modalClientEmail.trim() || undefined,
    });
  }

  function handleSaveWithoutClient() {
    closeClientSaveModal();
    onSaveClientPdf();
  }

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
              onClick={openClientSaveModal}
              disabled={!completeQuote || isSavingQuote}
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
      </header>

      {clientSaveModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeClientSaveModal}
        >
          <div
            className="relative z-10 mx-4 w-full max-w-md rounded-xl bg-tquot-surface p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-save-modal-title"
          >
            <h2
              id="client-save-modal-title"
              className="mb-4 text-lg font-bold text-tquot-text"
            >
              {t.clientSaveModalTitle}
            </h2>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tquot-muted">
                  {t.clientName} *
                </span>
                <input
                  type="text"
                  value={modalClientName}
                  onChange={(event) => setModalClientName(event.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-tquot-border bg-tquot-bg px-3 py-2 text-sm outline-none focus:border-tquot-accent focus:ring-2 focus:ring-tquot-accent/20"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tquot-muted">
                  {t.clientEmail}
                </span>
                <input
                  type="email"
                  value={modalClientEmail}
                  onChange={(event) => setModalClientEmail(event.target.value)}
                  className="w-full rounded-xl border border-tquot-border bg-tquot-bg px-3 py-2 text-sm outline-none focus:border-tquot-accent focus:ring-2 focus:ring-tquot-accent/20"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={!modalClientName.trim() || isSavingQuote}
                className="rounded-xl bg-tquot-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {isSavingQuote ? t.savingQuote : t.saveAndGeneratePdf}
              </button>
              <button
                type="button"
                onClick={handleSaveWithoutClient}
                disabled={isSavingQuote}
                className="text-sm font-semibold text-tquot-muted underline hover:text-tquot-accent disabled:opacity-50"
              >
                {t.saveWithoutClient}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

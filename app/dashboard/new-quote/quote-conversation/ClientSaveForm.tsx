"use client";

import { useState, useTransition } from "react";
import { saveQuoteWithClient } from "@/app/actions/quotes";
import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import { useDashboardLanguage } from "@/app/dashboard/dashboard-language-provider";

interface Props {
  quote: Quote;
  tripInput: ParsedTripInput;
  agentNotes?: string;
  onSaved: (result: { quoteId: string; clientId: string | null }) => void;
  onClose: () => void;
}

export function ClientSaveForm({
  quote,
  tripInput,
  agentNotes,
  onSaved,
  onClose,
}: Props) {
  const { t } = useDashboardLanguage();
  const [mode, setMode] = useState<"new" | "skip">("new");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveQuoteWithClient({
          quote,
          tripInput,
          agentNotes,
          client:
            mode === "new"
              ? {
                  kind: "new",
                  data: {
                    name,
                    email: email || null,
                    phone: phone || null,
                  },
                }
              : { kind: "skip" },
        });
        onSaved(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "unknown_error");
      }
    });
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {t.clientName} *
        </span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {t.clientEmail}
        </span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Teléfono
        </span>
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </label>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="flex flex-col gap-3">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || (mode === "new" && !name.trim())}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending ? "Guardando…" : t.saveAndGeneratePdf}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setMode("skip");
            setError(null);
            startTransition(async () => {
              try {
                const result = await saveQuoteWithClient({
                  quote,
                  tripInput,
                  agentNotes,
                  client: { kind: "skip" },
                });
                onSaved(result);
              } catch (err) {
                setError(err instanceof Error ? err.message : "unknown_error");
              }
            });
          }}
          disabled={pending}
          className="text-sm font-semibold text-neutral-500 underline hover:text-blue-600 disabled:opacity-50"
        >
          {t.saveWithoutClient}
        </button>
      </div>
    </div>
  );
}

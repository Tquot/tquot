"use client";

import { useState, useTransition } from "react";
import { updateQuoteStatus } from "@/lib/quote-status/update-status";
import {
  getAllowedTransitions,
  STATUS_LABELS,
  type QuoteStatus,
} from "@/lib/quote-status/transitions";

interface Props {
  quoteId: string;
  currentStatus: QuoteStatus;
  onStatusChange?: (status: QuoteStatus) => void;
}

export function StatusSelector({
  quoteId,
  currentStatus,
  onStatusChange,
}: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [pending, startTransition] = useTransition();
  const allowed = getAllowedTransitions(status);

  const handleChange = (newStatus: QuoteStatus) => {
    const ok = confirm(
      `¿Cambiar estado de "${STATUS_LABELS[status]}" a "${STATUS_LABELS[newStatus]}"?`,
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await updateQuoteStatus({ quoteId, newStatus });
      if (!result.success) {
        alert(`Error: ${result.error}`);
        return;
      }
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    });
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <span className="text-sm text-tquot-muted">Estado:</span>
      <span className="rounded-full bg-tquot-bg px-3 py-0.5 text-sm font-medium text-tquot-text">
        {STATUS_LABELS[status]}
      </span>
      {allowed.length > 0 && !pending ? (
        <select
          onChange={(e) => {
            const newStatus = e.target.value as QuoteStatus;
            if (newStatus && newStatus !== status) handleChange(newStatus);
            e.target.value = "";
          }}
          defaultValue=""
          className="rounded-md border border-tquot-border bg-white px-2 py-1 text-sm"
        >
          <option value="" disabled>
            Cambiar a…
          </option>
          {allowed.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      ) : null}
      {pending ? (
        <span className="text-xs text-tquot-muted">Actualizando…</span>
      ) : null}
    </div>
  );
}

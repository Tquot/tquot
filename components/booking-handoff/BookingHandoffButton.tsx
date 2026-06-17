"use client";

import { useState, useRef, useEffect } from "react";
import type { BookingHandoff, HandoffAction } from "@/lib/booking-handoff/types";

interface Props {
  handoff: BookingHandoff;
}

export function BookingHandoffButton({ handoff }: Props) {
  const [open, setOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const executeAction = async (action: HandoffAction) => {
    if (action.kind === "open_url") {
      window.open(
        action.url,
        action.openInNewTab ? "_blank" : "_self",
        "noopener,noreferrer",
      );
      setOpen(false);
      return;
    }

    if (action.kind === "copy_text") {
      try {
        await navigator.clipboard.writeText(action.text);
        setCopyFeedback(action.label);
        setTimeout(() => setCopyFeedback(null), 2000);
      } catch {
        fallbackCopy(action.text);
        setCopyFeedback(action.label);
        setTimeout(() => setCopyFeedback(null), 2000);
      }
      return;
    }

    if (action.kind === "render_form") {
      submitForm(action.targetUrl, action.method, action.fields);
      setOpen(false);
      return;
    }
  };

  const expiringSoon = handoff.metadata?.expiresAt
    ? new Date(handoff.metadata.expiresAt).getTime() - Date.now() < 5 * 60 * 1000
    : false;

  return (
    <div className="relative inline-flex" ref={containerRef}>
      <button
        type="button"
        onClick={() => executeAction(handoff.primary)}
        className={`inline-flex items-center rounded-l-md px-3 py-1.5 text-sm font-medium text-white transition ${
          handoff.primary.kind === "open_url"
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-neutral-700 hover:bg-neutral-800"
        }`}
      >
        {handoff.primary.label}
      </button>

      {handoff.secondary.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`rounded-r-md border-l border-white/20 px-2 py-1.5 text-sm text-white transition ${
            handoff.primary.kind === "open_url"
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-neutral-700 hover:bg-neutral-800"
          }`}
          aria-label="Más opciones"
        >
          ▾
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-80 rounded-md border border-neutral-200 bg-white shadow-lg">
          {expiringSoon && (
            <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠ El rateKey caduca pronto. Reserva con prontitud o re-cotiza.
            </div>
          )}
          {handoff.secondary.map((action, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => executeAction(action)}
              className="block w-full border-b border-neutral-100 px-3 py-2 text-left hover:bg-neutral-50 last:border-0"
            >
              <div className="text-sm font-medium text-neutral-900">{action.label}</div>
              {action.kind === "copy_text" && (
                <div className="mt-0.5 text-xs text-neutral-500">{action.description}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {copyFeedback && (
        <div className="absolute right-0 top-full z-30 mt-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs text-white shadow">
          ✓ Copiado: {copyFeedback}
        </div>
      )}
    </div>
  );
}

function fallbackCopy(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
}

function submitForm(
  targetUrl: string,
  method: "GET" | "POST",
  fields: Array<{ name: string; value: string }>,
) {
  const form = document.createElement("form");
  form.method = method;
  form.action = targetUrl;
  form.target = "_blank";
  for (const f of fields) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = f.name;
    input.value = f.value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  setTimeout(() => document.body.removeChild(form), 100);
}

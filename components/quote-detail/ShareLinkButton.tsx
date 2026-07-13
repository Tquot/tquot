"use client";

import { useState, useTransition } from "react";
import { createShare } from "@/lib/sharing/create-share";

interface Props {
  quoteId: string;
}

export function ShareLinkButton({ quoteId }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    startTransition(async () => {
      const result = await createShare({ quoteId, ttlDays: 30 });
      setUrl(result.url);
      await navigator.clipboard.writeText(result.url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-xl border border-tquot-teal/30 bg-tquot-teal/10 px-4 py-2.5 text-sm font-semibold text-tquot-teal hover:bg-tquot-teal/20 disabled:opacity-50"
      >
        {pending ? "Creando…" : url ? "Volver a crear" : "Compartir con cliente"}
      </button>
      {url ? (
        <span className="max-w-xs truncate text-xs text-tquot-muted">
          {copied ? "✓ Copiado" : url}
        </span>
      ) : null}
    </div>
  );
}

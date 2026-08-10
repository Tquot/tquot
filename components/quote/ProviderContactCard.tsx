"use client";

import { useState, useTransition } from "react";
import {
  Globe,
  Mail,
  Phone,
  Copy,
  Check,
  Flag,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExternalProvider } from "@/lib/recommendations/providers/types";

export function ProviderContactCard({
  provider,
  quoteId: _quoteId,
  cacheKey,
}: {
  provider: ExternalProvider;
  quoteId: string;
  cacheKey: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [, startTransition] = useTransition();

  async function copy(field: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 1800);
  }

  function report() {
    startTransition(async () => {
      await fetch("/api/providers/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cacheKey,
          providerId: provider.id,
          field: "whole",
        }),
      });
      setReported(true);
    });
  }

  return (
    <article className="bg-paper border border-border-1 rounded-lg p-4 shadow-soft">
      <header className="mb-2">
        <h4
          className="font-serif text-[17px] leading-tight text-ink"
          style={{ fontWeight: 500 }}
        >
          {provider.name}
        </h4>
        {provider.serviceArea && (
          <p className="text-[11px] text-text-3 mt-0.5 font-mono">
            {provider.serviceArea}
          </p>
        )}
      </header>

      <p className="text-body-sm text-text leading-relaxed mb-3">
        {provider.description}
      </p>

      {provider.signals.length > 0 && (
        <ul className="mb-3 space-y-1">
          {provider.signals.map((s) => (
            <li
              key={s}
              className="flex items-start gap-2 text-[11px] text-text-2"
            >
              <span className="text-accent mt-0.5">·</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5 pt-3 border-t border-border-1">
        <ContactRow
          icon={Globe}
          label={hostOf(provider.website.value)}
          href={provider.website.value}
          external
        />
        {provider.email && (
          <ContactRow
            icon={Mail}
            label={provider.email.value}
            href={`mailto:${provider.email.value}`}
            onCopy={() => copy("email", provider.email!.value)}
            copied={copied === "email"}
            tentative={provider.email.confidence !== "verified"}
          />
        )}
        {provider.phone && (
          <ContactRow
            icon={Phone}
            label={provider.phone.value}
            href={`tel:${provider.phone.value.replace(/\s/g, "")}`}
            onCopy={() => copy("phone", provider.phone!.value)}
            copied={copied === "phone"}
          />
        )}
      </div>

      <footer className="mt-3 pt-2.5 border-t border-border-1 flex items-center justify-between gap-3">
        <span className="text-[10px] text-text-3">
          Comprobado el{" "}
          {new Date(provider.checkedAt).toLocaleDateString("es-ES")}
          {provider.trust !== "verified" &&
            " · confirma antes de enviar al cliente"}
        </span>
        <button
          type="button"
          onClick={report}
          disabled={reported}
          className="inline-flex items-center gap-1 text-[10px] text-text-3 hover:text-danger transition-colors disabled:opacity-50 shrink-0"
        >
          <Flag size={10} strokeWidth={1.5} />
          {reported ? "Reportado" : "Dato incorrecto"}
        </button>
      </footer>
    </article>
  );
}

function ContactRow({
  icon: Icon,
  label,
  href,
  external,
  onCopy,
  copied,
  tentative,
}: {
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  label: string;
  href: string;
  external?: boolean;
  onCopy?: () => void;
  copied?: boolean;
  tentative?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 group">
      <Icon size={13} strokeWidth={1.5} className="text-text-3 shrink-0" />
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={cn(
          "flex-1 min-w-0 truncate text-body-sm transition-colors",
          tentative
            ? "text-text-2 hover:text-ink"
            : "text-ink hover:text-accent",
        )}
      >
        {label}
        {tentative && (
          <span className="ml-1.5 text-[10px] text-warning">sin confirmar</span>
        )}
      </a>
      {external && (
        <ExternalLink
          size={11}
          strokeWidth={1.5}
          className="text-text-3 shrink-0"
        />
      )}
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copiar"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-text-3 hover:text-ink shrink-0"
        >
          {copied ? (
            <Check size={12} strokeWidth={2} className="text-success" />
          ) : (
            <Copy size={12} strokeWidth={1.5} />
          )}
        </button>
      )}
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

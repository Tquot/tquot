"use client";

import type { RecommendedProvider } from "@/lib/recommendations/types";

interface Props {
  provider: RecommendedProvider;
}

const confidenceLabel: Record<
  RecommendedProvider["confidence"],
  { label: string; color: string }
> = {
  high: { label: "Alta confianza", color: "bg-emerald-100 text-emerald-700" },
  medium: { label: "Media", color: "bg-amber-100 text-amber-700" },
  low: { label: "Baja — verificar", color: "bg-red-100 text-red-700" },
};

export function RecommendationCard({ provider }: Props) {
  const conf = confidenceLabel[provider.confidence];

  return (
    <article className="rounded-md border border-neutral-200 bg-white p-3">
      <header className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-neutral-900">{provider.name}</h4>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${conf.color}`}
        >
          {conf.label}
        </span>
      </header>

      <p className="mt-1 text-xs text-neutral-700">{provider.description}</p>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <a
          href={provider.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {prettyHost(provider.website)} ↗
        </a>
        {provider.contact?.email && (
          <a
            href={`mailto:${provider.contact.email}`}
            className="text-neutral-700 hover:underline"
          >
            {provider.contact.email}
          </a>
        )}
        {provider.contact?.phone && (
          <a
            href={`tel:${provider.contact.phone}`}
            className="text-neutral-700 hover:underline"
          >
            {provider.contact.phone}
          </a>
        )}
      </div>

      {provider.pricingHint && (
        <p className="mt-2 text-xs text-neutral-600">
          <span className="font-medium">Precio:</span> {provider.pricingHint}
        </p>
      )}

      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-neutral-500 hover:text-neutral-700">
          Por qué lo recomendamos
        </summary>
        <p className="mt-1 leading-relaxed text-neutral-600">{provider.reasoning}</p>
      </details>
    </article>
  );
}

function prettyHost(url: string): string {
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

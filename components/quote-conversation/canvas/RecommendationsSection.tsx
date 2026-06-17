"use client";

import type { Recommendation } from "@/lib/recommendations/types";
import { getEntry, type ServiceCategory } from "@/lib/recommendations/catalog";
import { RecommendationCard } from "./RecommendationCard";

interface Props {
  recommendations: Recommendation[];
}

export function RecommendationsSection({ recommendations }: Props) {
  if (recommendations.length === 0) return null;

  return (
    <section className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-neutral-900">
          Servicios adicionales sugeridos
        </h2>
        <p className="mt-0.5 text-xs text-neutral-600">
          Proveedores no integrados en TQuot. Verifica los datos antes de derivar al cliente.
        </p>
      </header>

      <div className="space-y-4">
        {recommendations.map((rec, idx) => (
          <CategoryGroup key={`${rec.category}_${idx}`} recommendation={rec} />
        ))}
      </div>
    </section>
  );
}

function CategoryGroup({ recommendation }: { recommendation: Recommendation }) {
  const entry = getEntry(recommendation.category as ServiceCategory);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-800">{entry.label}</h3>
        {recommendation.source === "cache" && (
          <span className="text-xs text-neutral-500">caché</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {recommendation.providers.map((provider, idx) => (
          <RecommendationCard key={idx} provider={provider} />
        ))}
      </div>
    </div>
  );
}

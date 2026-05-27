"use client";

import { useState } from "react";
import type {
  AgencyConnectionRow,
  ProviderCatalogRow,
} from "@/lib/connectors/storage";
import { ConnectorCard } from "./ConnectorCard";
import { ConnectorModal } from "./ConnectorModal";

interface Props {
  catalog: (ProviderCatalogRow & { is_implemented_real: boolean })[];
  connections: AgencyConnectionRow[];
}

const CATEGORY_LABELS: Record<string, string> = {
  hotels: "Hoteles",
  flights: "Vuelos",
  activities: "Actividades",
  transfers: "Traslados",
  insurance: "Seguros",
  cars: "Coches",
};

export function IntegrationsClient({ catalog, connections }: Props) {
  const [selectedProvider, setSelectedProvider] = useState<
    ProviderCatalogRow | null
  >(null);

  // Indexar conexiones por providerId para acceso rápido
  const connectionsByProvider = new Map<string, AgencyConnectionRow>();
  for (const c of connections) connectionsByProvider.set(c.provider_id, c);

  // Agrupar catálogo por categoría
  const byCategory: Record<string, typeof catalog> = {};
  for (const p of catalog) {
    byCategory[p.category] ??= [];
    byCategory[p.category].push(p);
  }

  return (
    <div className="space-y-10">
      {Object.entries(byCategory).map(([category, providers]) => (
        <section key={category}>
          <h2 className="mb-4 text-lg font-medium text-neutral-900">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <ConnectorCard
                key={provider.id}
                provider={provider}
                connection={connectionsByProvider.get(provider.id)}
                onClick={() => setSelectedProvider(provider)}
              />
            ))}
          </div>
        </section>
      ))}

      {selectedProvider && (
        <ConnectorModal
          provider={selectedProvider}
          existingConnection={connectionsByProvider.get(selectedProvider.id)}
          onClose={() => setSelectedProvider(null)}
        />
      )}
    </div>
  );
}

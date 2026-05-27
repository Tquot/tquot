"use client";

import { useMemo, useState } from "react";
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
  const [connectionsState, setConnectionsState] = useState(connections);
  const [selectedProvider, setSelectedProvider] = useState<
    ProviderCatalogRow | null
  >(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Indexar conexiones por providerId para acceso rápido
  const connectionsByProvider = useMemo(() => {
    const map = new Map<string, AgencyConnectionRow>();
    for (const c of connectionsState) map.set(c.provider_id, c);
    return map;
  }, [connectionsState]);

  async function refreshConnections() {
    try {
      const res = await fetch("/api/connectors/connections", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        const message = `No se pudieron actualizar las conexiones (${res.status})`;
        console.error("[IntegrationsClient] refreshConnections failed:", res.status);
        setRefreshError(message);
        return;
      }
      const data = (await res.json()) as { connections?: AgencyConnectionRow[] };
      if (Array.isArray(data.connections)) {
        setConnectionsState(data.connections);
        setRefreshError(null);
      } else {
        const message = "Respuesta inválida al actualizar las conexiones";
        console.error("[IntegrationsClient] refreshConnections invalid payload:", data);
        setRefreshError(message);
      }
    } catch (error) {
      console.error("[IntegrationsClient] refreshConnections error:", error);
      setRefreshError("Error de red al actualizar las conexiones");
    }
  }

  async function handleSaved() {
    const provider = selectedProvider;
    await refreshConnections();
    if (provider) setSelectedProvider(provider);
  }

  // Agrupar catálogo por categoría
  const byCategory: Record<string, typeof catalog> = {};
  for (const p of catalog) {
    byCategory[p.category] ??= [];
    byCategory[p.category].push(p);
  }

  return (
    <div className="space-y-10">
      {refreshError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {refreshError}
        </div>
      )}

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
          onSaved={handleSaved}
          onDeleted={refreshConnections}
          onClose={() => setSelectedProvider(null)}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AgencyConnectionRow,
  ProviderCatalogRow,
} from "@/lib/connectors/storage";
import { ConnectorCard } from "./ConnectorCard";
import { ConnectorModal } from "./ConnectorModal";

type ConnectionRowPayload = AgencyConnectionRow & { providerId?: string };

/** agency_connections.provider_id (slug) — not the connection row uuid in `id`. */
function connectionProviderSlug(
  row: ConnectionRowPayload
): string {
  return (row.provider_id ?? row.providerId ?? "").trim().toLowerCase();
}

function normalizeConnection(row: ConnectionRowPayload): AgencyConnectionRow {
  return {
    ...row,
    provider_id: connectionProviderSlug(row),
  };
}

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
  const [connectionsState, setConnectionsState] = useState(() =>
    connections.map(normalizeConnection)
  );
  const [selectedProvider, setSelectedProvider] = useState<
    ProviderCatalogRow | null
  >(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Index by provider_catalog slug (agency_connections.provider_id), not connection uuid.
  const connectionsByProvider = useMemo(() => {
    const map = new Map<string, AgencyConnectionRow>();
    for (const c of connectionsState) {
      const slug = connectionProviderSlug(c);
      if (slug) map.set(slug, c);
    }
    return map;
  }, [connectionsState]);

  useEffect(() => {
    const hotelbeds = catalog.find(
      (p) => p.id === "hotelbeds" || p.name === "Hotelbeds"
    );
    console.log(
      "[IntegrationsClient] Hotelbeds provider.id:",
      hotelbeds?.id
    );
    console.log(
      "[IntegrationsClient] connectionsByProvider keys:",
      [...connectionsByProvider.keys()]
    );
    if (connectionsState[0]) {
      console.log(
        "[IntegrationsClient] sample connection row id vs provider_id:",
        connectionsState[0].id,
        connectionsState[0].provider_id
      );
    }
  }, [catalog, connectionsByProvider, connectionsState]);

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
        setConnectionsState(
          (data.connections as ConnectionRowPayload[]).map(normalizeConnection)
        );
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
                connection={connectionsByProvider.get(
                  provider.id.trim().toLowerCase()
                )}
                onClick={() => setSelectedProvider(provider)}
              />
            ))}
          </div>
        </section>
      ))}

      {selectedProvider && (
        <ConnectorModal
          key={`${selectedProvider.id}-${
            connectionsByProvider.get(
              selectedProvider.id.trim().toLowerCase()
            )?.id ?? "new"
          }`}
          provider={selectedProvider}
          existingConnection={connectionsByProvider.get(
            selectedProvider.id.trim().toLowerCase()
          )}
          onSaved={handleSaved}
          onDeleted={refreshConnections}
          onClose={() => setSelectedProvider(null)}
        />
      )}
    </div>
  );
}

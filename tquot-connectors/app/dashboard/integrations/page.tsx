import { Suspense } from "react";
import { listProviderCatalog, listAgencyConnections } from "@/lib/connectors/storage";
import { isProviderImplemented } from "@/lib/connectors/registry";
import { IntegrationsClient } from "./components/IntegrationsClient";

// AUTH_TODO: helper real
async function getAgencyId(): Promise<string> {
  throw new Error("AUTH_TODO");
}

export default async function IntegrationsPage() {
  // Cargar catálogo + conexiones en paralelo
  const agencyId = await getAgencyId();
  const [catalog, connections] = await Promise.all([
    listProviderCatalog(),
    listAgencyConnections(agencyId),
  ]);

  // Marcar qué proveedores están realmente implementados (registry)
  const enrichedCatalog = catalog.map((p) => ({
    ...p,
    is_implemented_real: p.is_implemented && isProviderImplemented(p.id),
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Integraciones
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Conecta los proveedores con los que trabaja tu agencia. TQuot usará tus
          credenciales para buscar disponibilidad y precios en cada uno.
        </p>
      </div>

      <Suspense fallback={<div>Cargando…</div>}>
        <IntegrationsClient
          catalog={enrichedCatalog}
          connections={connections}
        />
      </Suspense>
    </div>
  );
}

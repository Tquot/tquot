import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";
import { listProviderCatalog, listAgencyConnections } from "@/lib/connectors/storage";
import { isProviderImplemented } from "@/lib/connectors/registry";
import { IntegrationsClient } from "./components/IntegrationsClient";

export default async function IntegrationsPage() {
  const auth = await getAuthenticatedUserAndAgency();
  if ("response" in auth) {
    if (auth.response.status === 401) redirect("/login");
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-2 text-sm text-[#8B9CB3] shadow-[0_12px_40px_rgba(0,0,0,0.25)] transition-colors hover:border-[#00C9A7]/30 hover:text-[#00C9A7]"
        >
          ← Volver al dashboard
        </Link>
        <p className="text-sm text-neutral-600">
          Agencia no configurada. Crea tu agencia antes de conectar proveedores.
        </p>
      </div>
    );
  }

  const agencyId = auth.agencyId;
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
      <Link
        href="/dashboard"
        className="mb-8 inline-flex items-center rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-2 text-sm text-[#8B9CB3] shadow-[0_12px_40px_rgba(0,0,0,0.25)] transition-colors hover:border-[#00C9A7]/30 hover:text-[#00C9A7]"
      >
        ← Volver al dashboard
      </Link>

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

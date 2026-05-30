import { redirect } from "next/navigation";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";
import { listProviderCatalog, listAgencyConnections } from "@/lib/connectors/storage";
import { isProviderImplemented } from "@/lib/connectors/registry";
import { IntegrationsPageShell } from "./integrations-page-shell";

export default async function IntegrationsPage() {
  const auth = await getAuthenticatedUserAndAgency();
  if ("response" in auth) {
    if (auth.response.status === 401) redirect("/login");
    return <IntegrationsPageShell agencyNotConfigured />;
  }

  const agencyId = auth.agencyId;
  const [catalog, connections] = await Promise.all([
    listProviderCatalog(),
    listAgencyConnections(agencyId),
  ]);

  const enrichedCatalog = catalog.map((p) => ({
    ...p,
    is_implemented_real: p.is_implemented && isProviderImplemented(p.id),
  }));

  return (
    <IntegrationsPageShell catalog={enrichedCatalog} connections={connections} />
  );
}

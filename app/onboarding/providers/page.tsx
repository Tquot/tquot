import { ProviderSelector } from "@/components/onboarding/ProviderSelector";
import { getCurrentAgencyId } from "@/lib/auth";
import { listAgencyConnections } from "@/lib/connectors/storage";
import type { ProviderKey } from "@/lib/onboarding/constants";

export default async function ProvidersPage() {
  const agencyId = await getCurrentAgencyId();
  let initialConnected: ProviderKey[] = [];

  if (agencyId) {
    const connections = await listAgencyConnections(agencyId);
    initialConnected = connections
      .filter((c) => c.status === "active" || c.status === "pending")
      .map((c) => c.provider_id)
      .filter((id): id is ProviderKey =>
        id === "hotelbeds" || id === "duffel" || id === "booking",
      );
  }

  return <ProviderSelector initialConnected={initialConnected} />;
}

import { loadBookingConfig } from "@/lib/booking-handoff/config";
import { getClientWithHistory } from "@/lib/clients/loader";
import { buildPrefillFromClient } from "@/lib/clients/prefill";
import { QuoteConversation } from "./QuoteConversation";

interface PageProps {
  searchParams: Promise<{ clientId?: string }>;
}

export default async function NewQuotePage({ searchParams }: PageProps) {
  const agencyConfig = await loadBookingConfig();
  const params = await searchParams;

  let prefillText: string | undefined;
  let prefillClient: { id: string; name: string; email?: string } | undefined;

  if (params.clientId) {
    const client = await getClientWithHistory(params.clientId);
    if (client) {
      prefillClient = {
        id: client.id,
        name: client.name,
        email: client.email,
      };
      prefillText = buildPrefillFromClient({
        clientName: client.name,
        preferences: client.inferredPreferences,
      });
    }
  }

  return (
    <QuoteConversation
      agencyConfig={agencyConfig}
      prefillText={prefillText}
      prefillClient={prefillClient}
    />
  );
}

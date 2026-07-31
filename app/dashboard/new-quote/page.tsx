import Link from "next/link";
import { loadBookingConfig } from "@/lib/booking-handoff/config";
import { getClientWithHistory } from "@/lib/clients/loader";
import { buildPrefillFromClient } from "@/lib/clients/prefill";
import { loadQuoteForResume } from "@/lib/quotes/load-for-resume";
import { QuoteConversation } from "./QuoteConversation";
import { DEMO_SUGGESTION } from "@/lib/onboarding/constants";

interface PageProps {
  searchParams: Promise<{ clientId?: string; quoteId?: string; demo?: string }>;
}

export default async function NewQuotePage({ searchParams }: PageProps) {
  const agencyConfig = await loadBookingConfig();
  const params = await searchParams;
  const demo = params.demo === "1" || params.demo === "true";

  if (params.quoteId) {
    const resume = await loadQuoteForResume(params.quoteId);
    if (!resume) {
      return (
        <main className="mx-auto max-w-lg px-6 py-16 text-center">
          <h1 className="font-serif text-h1 text-ink" style={{ fontWeight: 500 }}>
            No se pudo retomar la cotización
          </h1>
          <p className="mt-3 text-body text-text-2">
            Falta el snapshot o no tienes acceso a esta cotización.
          </p>
          <Link
            href="/dashboard/quotes"
            className="mt-6 inline-flex h-10 items-center rounded-md bg-ink px-4 text-body-sm font-medium text-paper transition-colors hover:bg-ink-2"
          >
            Volver a cotizaciones
          </Link>
        </main>
      );
    }

    return (
      <QuoteConversation
        agencyConfig={agencyConfig}
        prefillClient={resume.client}
        initialResume={{
          quoteId: resume.quoteId,
          quote: resume.quote,
          tripInput: resume.tripInput,
        }}
      />
    );
  }

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
      demo={demo}
      initialMessage={demo ? DEMO_SUGGESTION : prefillText}
      autoStart={demo}
    />
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientDetailPanel } from "@/components/clients/ClientDetailPanel";
import { ClientQuoteTimeline } from "@/components/clients/ClientQuoteTimeline";
import { getClientWithHistory } from "@/lib/clients/loader";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params;
  const client = await getClientWithHistory(id);
  if (!client) notFound();

  return (
    <div className="min-h-screen px-6 py-10 text-tquot-text">
      <main className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            href="/dashboard/clients"
            className="inline-flex items-center rounded-lg border border-tquot-border bg-tquot-surface px-4 py-2 text-sm text-tquot-muted shadow-sm transition-colors hover:bg-tquot-bg hover:text-tquot-accent"
          >
            ← Volver a clientes
          </Link>
        </div>

        <header className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-tquot-text">
                {client.name}
              </h1>
              <p className="text-sm text-tquot-muted">
                {client.email ?? "sin email"} · {client.phone ?? "sin teléfono"}
              </p>
            </div>
            <Link
              href={`/dashboard/new-quote?clientId=${client.id}`}
              className="inline-flex rounded-xl bg-tquot-teal px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#00b396]"
            >
              Nueva cotización con preferencias
            </Link>
          </div>

          <div className="mt-4">
            <ClientDetailPanel
              preferences={client.inferredPreferences}
              quoteCount={client.totalQuotes}
            />
          </div>
        </header>

        <ClientQuoteTimeline quotes={client.quotes} />
      </main>
    </div>
  );
}

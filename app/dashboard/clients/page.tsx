import Link from "next/link";
import { Suspense } from "react";
import { listClients } from "@/lib/clients/loader";
import { ClientFilters } from "@/components/clients/ClientFilters";
import { ClientListItem } from "@/components/clients/ClientListItem";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    destination?: string;
    tier?: string;
    year?: string;
  }>;
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const clients = await listClients({
    search: params.search,
    destinationFilter: params.destination,
    tierFilter: params.tier,
    yearFilter: params.year ? Number(params.year) : undefined,
  });

  return (
    <div className="min-h-screen px-6 py-10 text-tquot-text">
      <main className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-lg border border-tquot-border bg-tquot-surface px-4 py-2 text-sm text-tquot-muted shadow-sm transition-colors hover:bg-tquot-bg hover:text-tquot-accent"
          >
            ← Volver al dashboard
          </Link>
        </div>

        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-tquot-teal">
              TQuot
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-tquot-text">
              Clientes
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-tquot-muted">
              Historial, preferencias inferidas y acceso rápido a nueva
              cotización pre-rellenada.
            </p>
          </div>
          <span className="shrink-0 text-sm text-tquot-muted">
            {clients.length} resultados
          </span>
        </header>

        <Suspense fallback={null}>
          <ClientFilters initial={params} />
        </Suspense>

        <div className="mt-4 space-y-2">
          {clients.length === 0 ? (
            <div className="rounded-xl border border-tquot-border bg-tquot-surface p-8 text-center text-sm text-tquot-muted shadow-sm">
              Sin clientes para los filtros aplicados.
              <div className="mt-4">
                <Link
                  href="/dashboard/new-quote"
                  className="inline-flex rounded-xl bg-tquot-teal px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#00b396]"
                >
                  Crear cotización
                </Link>
              </div>
            </div>
          ) : (
            clients.map((c) => <ClientListItem key={c.id} client={c} />)
          )}
        </div>
      </main>
    </div>
  );
}

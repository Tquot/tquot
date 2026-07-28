import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { QuotesTable } from "@/components/quotes/QuotesTable";
import { listQuotes } from "@/lib/quotes/list";
import type { QuoteStatus } from "@/lib/quote-status/transitions";

interface QuotesPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
  }>;
}

const FILTERS: Array<{ value: "all" | QuoteStatus; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "draft", label: "Borrador" },
  { value: "sent", label: "Enviadas" },
  { value: "accepted", label: "Aceptadas" },
  { value: "reserved", label: "Reservadas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "expired", label: "Caducadas" },
];

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const params = await searchParams;
  const status = normalizeStatus(params.status);
  const search = params.q?.trim() ?? "";

  const quotes = await listQuotes({
    limit: 200,
    status: status === "all" ? undefined : status,
    search: search || undefined,
  });

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-10 sm:py-12">
      <section className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow className="mb-3 block">Cotizaciones</Eyebrow>
            <h1 className="font-serif text-display-2 text-ink">Archivo</h1>
            <p className="mt-2 max-w-2xl text-body text-text-2">
              Busca, filtra y retoma cotizaciones. Abre el PDF o continúa la
              conversación desde donde la dejaste.
            </p>
          </div>
          <Link
            href="/dashboard/new-quote"
            className="inline-flex h-10 items-center rounded-md bg-ink px-4 text-body-sm font-medium text-paper transition-colors hover:bg-ink-2"
          >
            Nueva cotización
          </Link>
        </div>

        <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {status !== "all" ? (
            <input type="hidden" name="status" value={status} />
          ) : null}
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Buscar por destino o cliente…"
            className="h-10 w-full max-w-md rounded-md border border-border-1 bg-paper px-3 text-body-sm text-ink outline-none transition-colors placeholder:text-text-3 focus:border-border-3"
          />
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border-2 px-4 text-body-sm font-medium text-ink transition-colors hover:bg-paper-2"
          >
            Buscar
          </button>
          {search ? (
            <Link
              href={
                status === "all"
                  ? "/dashboard/quotes"
                  : `/dashboard/quotes?status=${status}`
              }
              className="text-body-sm text-text-2 transition-colors hover:text-ink"
            >
              Limpiar
            </Link>
          ) : null}
        </form>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const active = filter.value === status;
            const href = buildFilterHref(filter.value, search);

            return (
              <Link
                key={filter.value}
                href={href}
                className={
                  active
                    ? "rounded-full border border-ink bg-ink px-3 py-1.5 text-body-sm text-paper"
                    : "rounded-full border border-border-1 px-3 py-1.5 text-body-sm text-text transition-colors hover:border-border-3 hover:text-ink"
                }
              >
                {filter.label}
              </Link>
            );
          })}
        </div>

        <QuotesTable quotes={quotes} />
      </section>
    </main>
  );
}

function buildFilterHref(
  status: "all" | QuoteStatus,
  search: string,
): string {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (search) params.set("q", search);
  const query = params.toString();
  return query ? `/dashboard/quotes?${query}` : "/dashboard/quotes";
}

function normalizeStatus(value?: string): "all" | QuoteStatus {
  switch (value) {
    case "draft":
    case "sent":
    case "accepted":
    case "reserved":
    case "cancelled":
    case "expired":
      return value;
    default:
      return "all";
  }
}

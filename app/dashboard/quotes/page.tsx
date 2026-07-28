import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { RecentQuotesStrip } from "@/components/dashboard/RecentQuotesStrip";
import { listRecentQuotes } from "@/lib/quotes/recent";
import type { QuoteStatus } from "@/lib/quote-status/transitions";

interface QuotesPageProps {
  searchParams: Promise<{
    status?: string;
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
  const quotes = await listRecentQuotes({
    limit: 100,
    status: status === "all" ? undefined : status,
  });

  return (
    <main className="mx-auto max-w-[1080px] px-6 py-10 sm:py-12">
      <section className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow className="mb-3 block">Cotizaciones</Eyebrow>
            <h1 className="font-serif text-display-2 text-ink">Archivo reciente</h1>
            <p className="mt-2 max-w-2xl text-body text-text-2">
              Revisa las últimas cotizaciones y ábrelas directamente en PDF.
            </p>
          </div>
          <Link
            href="/dashboard/new-quote"
            className="inline-flex h-10 items-center rounded-md bg-ink px-4 text-body-sm font-medium text-paper transition-colors hover:bg-ink-2"
          >
            Nueva cotización
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const active = filter.value === status;
            const href =
              filter.value === "all"
                ? "/dashboard/quotes"
                : `/dashboard/quotes?status=${filter.value}`;

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

        {quotes.length > 0 ? (
          <RecentQuotesStrip quotes={quotes} />
        ) : (
          <div className="rounded-lg border border-border-1 bg-paper-2 px-6 py-10 text-center text-body-sm text-text-2">
            No hay cotizaciones para este filtro.{" "}
            <Link href="/dashboard/new-quote" className="text-ink underline">
              Crear una nueva
            </Link>
            .
          </div>
        )}
      </section>
    </main>
  );
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

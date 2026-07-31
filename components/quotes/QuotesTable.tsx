import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { QuoteListItem } from "@/lib/quotes/list";
import type { QuoteStatus } from "@/lib/quote-status/transitions";
import { STATUS_BADGE_TONE } from "@/lib/quote-status/transitions";

const STATUS_TONE = STATUS_BADGE_TONE;

interface QuotesTableProps {
  quotes: QuoteListItem[];
}

export function QuotesTable({ quotes }: QuotesTableProps) {
  if (quotes.length === 0) {
    return (
      <div className="rounded-lg border border-border-1 bg-paper-2 px-6 py-10 text-center text-body-sm text-text-2">
        No hay cotizaciones para este filtro.{" "}
        <Link href="/dashboard/new-quote" className="text-ink underline">
          Crear una nueva
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border-1 bg-paper">
      <table className="w-full min-w-[960px] text-left">
        <thead>
          <tr className="border-b border-border-1 bg-paper-2">
            <th className="px-4 py-3 font-mono text-eyebrow uppercase text-text-3">
              Referencia
            </th>
            <th className="px-4 py-3 font-mono text-eyebrow uppercase text-text-3">
              Destino
            </th>
            <th className="px-4 py-3 font-mono text-eyebrow uppercase text-text-3">
              Fechas
            </th>
            <th className="px-4 py-3 font-mono text-eyebrow uppercase text-text-3">
              Paxs
            </th>
            <th className="px-4 py-3 font-mono text-eyebrow uppercase text-text-3">
              Total
            </th>
            <th className="px-4 py-3 font-mono text-eyebrow uppercase text-text-3">
              Estado
            </th>
            <th className="px-4 py-3 font-mono text-eyebrow uppercase text-text-3">
              Cliente
            </th>
            <th className="px-4 py-3 font-mono text-eyebrow uppercase text-text-3">
              Creada
            </th>
            <th className="px-4 py-3 font-mono text-eyebrow uppercase text-text-3">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => (
            <tr
              key={quote.id}
              className="border-b border-border-1 last:border-0 hover:bg-paper-2/60"
            >
              <td className="px-4 py-3 font-mono text-mono-sm text-ink tabular-nums">
                {quote.reference}
              </td>
              <td className="px-4 py-3 text-body-sm text-ink">
                {quote.destination}
              </td>
              <td className="px-4 py-3 text-body-sm text-text-2">
                {formatDateRange(quote.departureDate, quote.returnDate)}
              </td>
              <td className="px-4 py-3 font-mono text-mono-sm text-text-2 tabular-nums">
                {formatPassengers(quote)}
              </td>
              <td className="px-4 py-3 font-mono text-mono-md text-ink tabular-nums">
                {Math.round(quote.totalPrice).toLocaleString("es-ES")}{" "}
                {quote.currency}
              </td>
              <td className="px-4 py-3">
                <Badge tone={STATUS_TONE[quote.status]}>
                  {quote.statusLabel}
                </Badge>
              </td>
              <td className="max-w-[160px] truncate px-4 py-3 text-body-sm text-text-2">
                {quote.clientName}
              </td>
              <td className="px-4 py-3 text-body-sm text-text-2">
                {formatCreatedAt(quote.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/quotes/${quote.id}/pdf?variant=client&inline=1`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-body-sm text-text transition-colors hover:text-ink"
                  >
                    PDF
                  </a>
                  {quote.hasSnapshot ? (
                    <Link
                      href={`/dashboard/new-quote?quoteId=${quote.id}`}
                      className="rounded-md bg-ink px-2.5 py-1 text-body-sm font-medium text-paper transition-colors hover:bg-ink-2"
                    >
                      Retomar
                    </Link>
                  ) : (
                    <span
                      className="rounded-md border border-border-1 px-2.5 py-1 text-body-sm text-text-3"
                      title="Esta cotización no tiene snapshot para retomar"
                    >
                      Retomar
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDateRange(
  departure: string | null,
  returnDate: string | null,
): string {
  if (!departure && !returnDate) return "—";
  const start = departure ? formatShortDate(departure) : "?";
  const end = returnDate ? formatShortDate(returnDate) : "?";
  return `${start} → ${end}`;
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatPassengers(quote: QuoteListItem): string {
  const parts = [`${quote.adults}A`];
  if (quote.children > 0) parts.push(`${quote.children}N`);
  if (quote.infants > 0) parts.push(`${quote.infants}B`);
  return parts.join(" · ");
}

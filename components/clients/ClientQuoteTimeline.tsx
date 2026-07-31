import Link from "next/link";
import type { ClientQuoteSummary } from "@/lib/clients/types";

interface Props {
  quotes: ClientQuoteSummary[];
}

export function ClientQuoteTimeline({ quotes }: Props) {
  if (quotes.length === 0) {
    return (
      <div className="rounded-xl border border-tquot-border bg-tquot-surface p-8 text-center text-sm text-tquot-muted shadow-sm">
        Sin cotizaciones aún.
      </div>
    );
  }

  const visible = quotes.slice(0, 20);

  return (
    <div className="space-y-2">
      <h2 className="mb-2 text-sm font-semibold text-tquot-muted">Historial</h2>
      {visible.map((q) => (
        <a
          key={q.id}
          href={`/api/quotes/${q.id}/pdf?variant=client`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-xl border border-tquot-border bg-tquot-surface px-4 py-2 shadow-sm transition hover:bg-tquot-bg"
        >
          <div>
            <div className="text-sm font-medium text-tquot-text">{q.destination}</div>
            <div className="text-xs text-tquot-muted">
              {q.checkIn} → {q.checkOut} ·{" "}
              {new Date(q.createdAt).toLocaleDateString("es-ES")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold tabular-nums text-tquot-teal">
              {Math.round(q.totalPrice).toLocaleString("es-ES")} {q.currency}
            </div>
            <span
              className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(q.status)}`}
            >
              {q.status}
            </span>
          </div>
        </a>
      ))}
      {quotes.length > 20 ? (
        <p className="pt-2 text-center text-xs text-tquot-muted">
          Mostrando 20 de {quotes.length}.{" "}
          <Link href="/dashboard/clients" className="text-tquot-teal underline">
            Volver al listado
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-100 text-emerald-800";
    case "reserved":
      return "bg-emerald-100 text-emerald-700";
    case "accepted":
      return "bg-green-100 text-green-800";
    case "in_progress":
      return "bg-amber-100 text-amber-800";
    case "sent":
      return "bg-sky-100 text-sky-800";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface RecentQuote {
  id: string;
  destination: string;
  clientName: string;
  imageUrl?: string;
  totalPrice: number;
  currency: string;
  status: "draft" | "sent" | "accepted" | "reserved" | "cancelled" | "expired";
  createdAt: string;
}

interface RecentQuotesStripProps {
  quotes: RecentQuote[];
}

const STATUS_LABEL: Record<RecentQuote["status"], string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  reserved: "Reservada",
  cancelled: "Cancelada",
  expired: "Caducada",
};

const STATUS_TONE: Record<
  RecentQuote["status"],
  "neutral" | "info" | "success" | "umber" | "danger" | "warning"
> = {
  draft: "neutral",
  sent: "info",
  accepted: "success",
  reserved: "umber",
  cancelled: "danger",
  expired: "warning",
};

export function RecentQuotesStrip({ quotes }: RecentQuotesStripProps) {
  if (quotes.length === 0) {
    return (
      <div className="py-8 text-center text-body-sm text-text-2">
        Aún no tienes cotizaciones.{" "}
        <Link href="/dashboard/new-quote" className="text-ink underline">
          Crea la primera
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-3 snap-x snap-mandatory">
      {quotes.map((quote) => (
        <QuoteMiniCard key={quote.id} quote={quote} />
      ))}
    </div>
  );
}

function QuoteMiniCard({ quote }: { quote: RecentQuote }) {
  return (
    <a
      href={`/api/quotes/${quote.id}/pdf?variant=client&inline=1`}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group w-[220px] shrink-0 snap-start overflow-hidden rounded-lg border border-border-1 bg-paper",
        "shadow-card transition-shadow duration-180 hover:shadow-card-hover",
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-paper-3">
        {quote.imageUrl ? (
          <img
            src={quote.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-body-sm text-text-3">
            Sin foto
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink/60 to-transparent" />
        <div className="absolute right-2 bottom-2 left-2 flex items-end justify-between gap-2">
          <h3 className="font-serif text-[17px] leading-tight tracking-tight text-paper">
            {quote.destination}
          </h3>
        </div>
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-body-sm text-text-2">
            {quote.clientName}
          </span>
          <Badge tone={STATUS_TONE[quote.status]}>
            {STATUS_LABEL[quote.status]}
          </Badge>
        </div>
        <div className="font-mono text-mono-md text-ink tabular-nums">
          {Math.round(quote.totalPrice).toLocaleString("es-ES")} {quote.currency}
        </div>
      </div>
    </a>
  );
}

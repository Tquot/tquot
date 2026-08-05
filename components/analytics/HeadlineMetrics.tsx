import { TrendingUp, TrendingDown } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { AgencyAnalytics } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

export function HeadlineMetrics({ data }: { data: AgencyAnalytics }) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-x-12 gap-y-8 items-start">
      <div>
        <div
          className="font-serif text-[56px] md:text-[88px] leading-none tracking-[-0.04em] text-ink tabular-nums"
          style={{ fontWeight: 500 }}
        >
          {data.quotes.count.toLocaleString("es-ES")}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-h3 text-text">Cotizaciones</span>
          {data.quotes.delta_pct != null && data.quotes.delta_pct !== 0 && (
            <Delta value={data.quotes.delta_pct} />
          )}
        </div>
        <p className="mt-1 text-[12px] text-text-3">
          {data.quotes.prev_count} en los {data.range.days} días anteriores
        </p>
      </div>

      <dl className="space-y-5">
        <Metric
          label="Volumen cotizado"
          value={fmtMoney(data.volume.quoted)}
          hint={
            data.volume.delta_pct != null
              ? `${signed(data.volume.delta_pct)} % vs periodo anterior`
              : undefined
          }
        />
        <Metric
          label="Volumen reservado"
          value={fmtMoney(data.volume.won)}
          hint={`${data.conversion.won} cotizaciones cerradas`}
        />
        <Metric
          label="Margen sobre reservado"
          value={fmtMoney(data.volume.margin_won)}
          hint="Diferencia entre PVP y neto de lo reservado"
        />
        <Metric label="Ticket medio" value={fmtMoney(data.volume.avg_ticket)} />
        <Metric
          label="Clientes activos"
          value={String(data.active_clients)}
          hint="Con al menos una cotización en el periodo"
        />
      </dl>
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-border-1 last:border-0">
      <dt className="min-w-0">
        <Eyebrow>{label}</Eyebrow>
        {hint && <p className="mt-1 text-[11px] text-text-3">{hint}</p>}
      </dt>
      <dd className="font-mono text-h2 text-ink tabular-nums shrink-0">{value}</dd>
    </div>
  );
}

function Delta({ value }: { value: number }) {
  const positive = value > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-body-sm font-mono tabular-nums",
        positive ? "text-success" : "text-danger",
      )}
    >
      <Icon size={13} strokeWidth={1.5} />
      {signed(value)} %
    </span>
  );
}

function fmtMoney(n: number): string {
  return `${Math.round(n).toLocaleString("es-ES")} €`;
}

function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${n}`;
}


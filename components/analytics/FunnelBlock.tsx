import { Eyebrow } from "@/components/ui/Eyebrow";
import type { AgencyAnalytics } from "@/lib/analytics/types";

const STAGES: Array<{
  key: keyof AgencyAnalytics["funnel"];
  label: string;
  tone: string;
}> = [
  { key: "draft", label: "Borradores", tone: "bg-border-2" },
  { key: "awaiting", label: "Esperando cliente", tone: "bg-info" },
  { key: "won", label: "Cerradas", tone: "bg-success" },
  { key: "expired", label: "Caducadas", tone: "bg-warning" },
  { key: "cancelled", label: "Canceladas", tone: "bg-danger" },
];

export function FunnelBlock({
  funnel,
  conversion,
}: {
  funnel: AgencyAnalytics["funnel"];
  conversion: AgencyAnalytics["conversion"];
}) {
  const total = Object.values(funnel).reduce((s, n) => s + n, 0);
  if (total === 0) return null;

  const deltaRate =
    conversion.rate_pct != null && conversion.prev_rate_pct != null
      ? conversion.rate_pct - conversion.prev_rate_pct
      : null;

  return (
    <section>
      <Eyebrow className="block mb-4">Estado de las cotizaciones</Eyebrow>

      <div className="mb-6">
        <div className="flex items-baseline gap-3">
          <span
            className="font-serif text-[48px] leading-none text-ink tabular-nums"
            style={{ fontWeight: 500 }}
          >
            {conversion.rate_pct != null ? `${conversion.rate_pct}` : "—"}
          </span>
          <span className="text-h3 text-text-2">%</span>
          {deltaRate != null && deltaRate !== 0 && (
            <span
              className={`text-body-sm font-mono ${
                deltaRate > 0 ? "text-success" : "text-danger"
              }`}
            >
              {deltaRate > 0 ? "+" : ""}
              {deltaRate.toFixed(1)} pts
            </span>
          )}
        </div>
        <p className="mt-1 text-body-sm text-text-2">
          {conversion.won} cerradas de {conversion.decidable} enviadas
        </p>
        <p className="mt-0.5 text-[11px] text-text-3">
          Los borradores no cuentan. Las caducadas sí.
        </p>
      </div>

      <div className="flex h-2 rounded-full overflow-hidden mb-4">
        {STAGES.map((s) => {
          const n = funnel[s.key];
          if (n === 0) return null;
          return (
            <div
              key={s.key}
              className={s.tone}
              style={{ width: `${(n / total) * 100}%` }}
            />
          );
        })}
      </div>

      <dl className="space-y-2">
        {STAGES.map((s) => {
          const n = funnel[s.key];
          if (n === 0) return null;
          return (
            <div key={s.key} className="flex items-center gap-3 text-body-sm">
              <span className={`w-2 h-2 rounded-full ${s.tone} shrink-0`} />
              <dt className="flex-1 text-text">{s.label}</dt>
              <dd className="font-mono text-ink tabular-nums">{n}</dd>
              <dd className="font-mono text-text-3 tabular-nums w-12 text-right">
                {Math.round((n / total) * 100)} %
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}


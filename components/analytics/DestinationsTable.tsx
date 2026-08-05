import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";
import type { AgencyAnalytics } from "@/lib/analytics/types";

export function DestinationsTable({
  destinations,
}: {
  destinations: AgencyAnalytics["destinations"];
}) {
  if (destinations.length === 0) return null;

  const maxQuotes = Math.max(...destinations.map((d) => d.quotes));

  return (
    <section>
      <Eyebrow className="block mb-1">Destinos</Eyebrow>
      <p className="text-[12px] text-text-3 mb-5">
        Ordenados por volumen de trabajo. La conversión dice dónde merece
        la pena insistir.
      </p>

      <div className="border-t border-border-2">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 py-2.5 border-b border-border-2">
          <span className="eyebrow">Destino</span>
          <span className="eyebrow text-right w-20">Cotiz.</span>
          <span className="eyebrow text-right w-24">Volumen</span>
          <span className="eyebrow text-right w-20">Conv.</span>
        </div>

        {destinations.map((d) => (
          <div
            key={d.name}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-4 py-3 border-b border-border-1 items-center"
          >
            <div className="min-w-0">
              <div
                className="font-serif text-[17px] text-ink truncate"
                style={{ fontWeight: 500 }}
              >
                {d.name}
              </div>
              <div className="h-0.5 bg-border-1 mt-1.5 rounded-full overflow-hidden max-w-[200px]">
                <div
                  className="h-full bg-border-3"
                  style={{ width: `${(d.quotes / maxQuotes) * 100}%` }}
                />
              </div>
            </div>
            <span className="font-mono text-mono-md text-ink tabular-nums text-right w-20">
              {d.quotes}
            </span>
            <span className="font-mono text-mono-md text-text-2 tabular-nums text-right w-24">
              {Math.round(d.volume / 1000)}k €
            </span>
            <span
              className={cn(
                "font-mono text-mono-md tabular-nums text-right w-20",
                d.conversion_pct == null
                  ? "text-text-3"
                  : d.conversion_pct >= 40
                    ? "text-success"
                    : d.conversion_pct >= 20
                      ? "text-ink"
                      : "text-text-2",
              )}
            >
              {d.conversion_pct != null ? `${d.conversion_pct} %` : "—"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}


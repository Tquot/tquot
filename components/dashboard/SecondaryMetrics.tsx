import { Eyebrow } from "@/components/ui/Eyebrow";

export type MetricFormat = "currency" | "percent" | "count";

export interface SecondaryMetricItem {
  label: string;
  value: number;
  unit?: string;
  format: MetricFormat;
}

interface SecondaryMetricsProps {
  items: SecondaryMetricItem[];
}

export function SecondaryMetrics({ items }: SecondaryMetricsProps) {
  return (
    <dl className="space-y-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-baseline justify-between gap-4 border-b border-border-1 pb-4 last:border-0"
        >
          <dt>
            <Eyebrow>{item.label}</Eyebrow>
          </dt>
          <dd className="font-mono text-h2 text-ink tabular-nums">
            {formatValue(item.value, item.format)}
            {item.unit ? (
              <span className="ml-1 text-h3 text-text-2">{item.unit}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function formatValue(value: number, format: MetricFormat): string {
  if (format === "currency") return Math.round(value).toLocaleString("es-ES");
  if (format === "percent") return value.toFixed(0);
  return value.toLocaleString("es-ES");
}

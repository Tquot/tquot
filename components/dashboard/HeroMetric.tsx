import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroMetricProps {
  value: number;
  label: string;
  delta?: number;
}

export function HeroMetric({ value, label, delta }: HeroMetricProps) {
  return (
    <div className="space-y-2">
      <div className="font-serif text-[56px] leading-none tracking-[-0.04em] text-ink tabular-nums md:text-[88px]">
        {value.toLocaleString("es-ES")}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-h3 text-text">{label}</span>
        {delta != null && delta !== 0 ? <DeltaTag delta={delta} /> : null}
      </div>
    </div>
  );
}

function DeltaTag({ delta }: { delta: number }) {
  const isPositive = delta > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-body-sm tabular-nums",
        isPositive ? "text-success" : "text-danger",
      )}
    >
      <Icon size={13} strokeWidth={1.5} />
      {isPositive ? "+" : ""}
      {delta}%
    </span>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { RangePreset } from "@/lib/analytics/types";

const OPTIONS: Array<{ value: RangePreset; label: string }> = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
  { value: "month", label: "Este mes" },
  { value: "prev_month", label: "Mes pasado" },
  { value: "ytd", label: "Año" },
];

export function RangeSelector({ current }: { current: RangePreset }) {
  const router = useRouter();
  const params = useSearchParams();

  function pick(value: RangePreset) {
    const next = new URLSearchParams(params.toString());
    next.set("range", value);
    router.push(`/analytics?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => pick(o.value)}
          className={cn(
            "h-7 px-3 rounded-full text-body-sm font-medium transition-colors duration-140",
            current === o.value
              ? "bg-ink text-paper"
              : "bg-paper-2 text-text-2 hover:bg-paper-3 hover:text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}


"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { RangePreset } from "@/lib/analytics/types";
import { useDashboardLanguage } from "@/app/dashboard/dashboard-language-provider";

export function RangeSelector({ current }: { current: RangePreset }) {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useDashboardLanguage();

  const OPTIONS: Array<{ value: RangePreset; label: string }> = [
    { value: "7d", label: t.analyticsRange7d },
    { value: "30d", label: t.analyticsRange30d },
    { value: "90d", label: t.analyticsRange90d },
    { value: "month", label: t.analyticsRangeMonth },
    { value: "prev_month", label: t.analyticsRangePrevMonth },
    { value: "ytd", label: t.analyticsRangeYtd },
  ];

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

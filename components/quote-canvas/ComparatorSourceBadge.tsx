"use client";

import type { ComparatorEntry } from "@/lib/comparator/types";

interface Props {
  entry: ComparatorEntry;
}

export function ComparatorSourceBadge({ entry }: Props) {
  if (entry.source === "snapshot") {
    const stale = entry.ageMinutes > 30;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
          stale ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
        }`}
        title={`Tarifa cotizada hace ${entry.ageMinutes} min`}
      >
        Tarifa cotizada
        {stale ? ` · hace ${entry.ageMinutes} min` : null}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
      Precio actual
    </span>
  );
}

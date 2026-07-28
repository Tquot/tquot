"use client";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";
import type { ComparatorEntry } from "@/lib/comparator/types";

interface Props {
  entries: ComparatorEntry[];
}

export function ComparatorStrip({ entries }: Props) {
  const availablePrices = entries
    .filter((e) => e.available && e.totalPrice != null)
    .map((e) => e.totalPrice as number);
  const cheapest =
    availablePrices.length > 0 ? Math.min(...availablePrices) : undefined;

  if (entries.length === 0) return null;

  return (
    <div className="mb-4 rounded-md border border-border-1 bg-paper-2 p-3">
      <Eyebrow className="mb-2 block">Comparativa</Eyebrow>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {entries.map((entry) => (
          <ComparatorChip
            key={`${entry.provider}-${entry.source}`}
            entry={entry}
            isCheapest={
              cheapest != null &&
              entry.available &&
              entry.totalPrice === cheapest
            }
          />
        ))}
      </div>
    </div>
  );
}

function ComparatorChip({
  entry,
  isCheapest,
}: {
  entry: ComparatorEntry;
  isCheapest: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-[140px] shrink-0 rounded-md border px-3 py-2",
        isCheapest ? "border-ink bg-paper" : "border-border-1 bg-paper",
      )}
    >
      <div className="mb-1 font-mono text-eyebrow uppercase text-text-2">
        {entry.provider}
      </div>
      {entry.available ? (
        <>
          <div className="font-mono text-mono-md text-ink tabular-nums">
            {Math.round(entry.totalPrice ?? 0)} {entry.currency}
          </div>
          <div className="mt-0.5 text-[10px] text-text-2">
            {entry.source === "snapshot" ? "cotizada" : "actual"}
          </div>
        </>
      ) : (
        <div className="text-body-sm text-text-3">No disponible</div>
      )}
      {isCheapest ? <div className="mt-1.5 h-0.5 w-6 bg-umber" /> : null}
    </div>
  );
}

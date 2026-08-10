"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useDashboardLanguage } from "@/app/dashboard/dashboard-language-provider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";
import type { Assumption } from "@/lib/parser/defaults";
import { useQuoteConversationStore } from "@/lib/quote-conversation/store";

export function AssumptionBar({ assumptions }: { assumptions: Assumption[] }) {
  const { t } = useDashboardLanguage();
  if (assumptions.length === 0) return null;

  return (
    <div className="rounded-lg border border-border-1 bg-paper-2 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Eyebrow>{t.assumptionBarTitle}</Eyebrow>
        <span className="text-[11px] text-text-3">{t.assumptionBarHint}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {assumptions.map((a) => (
          <AssumptionChip key={a.field} assumption={a} />
        ))}
      </div>
    </div>
  );
}

function AssumptionChip({ assumption }: { assumption: Assumption }) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const applyAssumption = useQuoteConversationStore((s) => s.applyAssumption);

  const hasAlternatives = (assumption.alternatives?.length ?? 0) > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => hasAlternatives && setOpen((v) => !v)}
        title={assumption.reason}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-body-sm font-medium",
          "border bg-paper text-text transition-colors duration-140",
          confirmed
            ? "border-solid border-border-2"
            : "border-dashed border-border-3",
          hasAlternatives && "cursor-pointer hover:border-accent hover:text-ink",
        )}
      >
        {assumption.label}
        {hasAlternatives && (
          <ChevronDown size={12} strokeWidth={1.5} className="text-text-3" />
        )}
      </button>

      {open && hasAlternatives && (
        <div className="absolute left-0 top-9 z-20 min-w-[180px] animate-slide-up-fade rounded-md border border-border-2 bg-paper py-1 shadow-modal">
          {assumption.alternatives!.map((alt) => (
            <button
              key={alt.label}
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmed(true);
                void applyAssumption(assumption.field, alt.value);
              }}
              className="w-full px-3 py-1.5 text-left text-body-sm text-text transition-colors hover:bg-paper-2 hover:text-ink"
            >
              {alt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

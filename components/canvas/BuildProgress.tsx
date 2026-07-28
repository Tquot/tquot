"use client";

import { Check, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type CanvasSectionStatus =
  | "pending"
  | "searching"
  | "done"
  | "error"
  | "skipped";

export interface SectionProgress {
  key: "flights" | "hotels" | "experiences" | "transfers";
  label: string;
  status: CanvasSectionStatus;
  resultCount?: number;
  detail?: string;
}

interface Props {
  sections: SectionProgress[];
}

export function BuildProgress({ sections }: Props) {
  return (
    <div className="space-y-2 py-4">
      {sections.map((section, idx) => (
        <SectionRow key={section.key} section={section} index={idx} />
      ))}
    </div>
  );
}

function SectionRow({
  section,
  index,
}: {
  section: SectionProgress;
  index: number;
}) {
  return (
    <div
      className="grid animate-slide-up-fade grid-cols-[24px_1fr_auto] items-center gap-3 py-1"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-center">
        {section.status === "searching" ? (
          <Loader2
            size={14}
            strokeWidth={2}
            className="animate-[spinner-arc_700ms_linear_infinite] text-umber"
          />
        ) : null}
        {section.status === "done" ? (
          <Check size={14} strokeWidth={2} className="text-success" />
        ) : null}
        {section.status === "error" ? (
          <AlertCircle size={14} strokeWidth={1.5} className="text-danger" />
        ) : null}
        {section.status === "skipped" ? (
          <span className="text-[12px] text-text-3">—</span>
        ) : null}
        {section.status === "pending" ? (
          <span className="h-1.5 w-1.5 rounded-full bg-border-2" />
        ) : null}
      </div>

      <div className="flex min-w-0 items-baseline gap-2">
        <span
          className={cn(
            "text-body-sm font-medium",
            section.status === "pending" && "text-text-3",
            section.status === "searching" && "text-text",
            section.status === "done" && "text-ink",
            section.status === "error" && "text-danger",
            section.status === "skipped" && "text-text-3",
          )}
        >
          {section.label}
        </span>
        {section.detail ? (
          <span className="truncate font-mono text-mono-sm text-text-2">
            · {section.detail}
          </span>
        ) : null}
      </div>

      <div className="text-right">
        {section.status === "done" && section.resultCount != null ? (
          <span className="font-mono text-mono-sm text-text-2 tabular-nums">
            {section.resultCount}{" "}
            {section.resultCount === 1 ? "opción" : "opciones"}
          </span>
        ) : null}
        {section.status === "searching" ? (
          <span className="animate-pulse-soft font-mono text-mono-sm text-text-3">
            buscando
          </span>
        ) : null}
      </div>
    </div>
  );
}

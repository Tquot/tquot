"use client";

import type { MatchResult } from "@/lib/accessibility/match";
import type { AccessibilityInfo } from "@/lib/accessibility/types";

interface Props {
  info?: AccessibilityInfo;
  match?: MatchResult;
  compact?: boolean;
}

export function AccessibilityBadge({ info, match }: Props) {
  if (!info && !match) return null;

  if (match && !match.matches) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
        No cumple {match.requiredMissing.length} requisitos
      </span>
    );
  }

  if (!info) return null;

  const color =
    info.source === "tur4all" && info.verified
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : info.source === "manual" && info.verified
        ? "bg-blue-100 text-blue-800 border-blue-200"
        : "bg-neutral-100 text-neutral-700 border-neutral-200";

  const sourceLabel =
    info.source === "tur4all"
      ? "TUR4all"
      : info.source === "manual"
        ? "Verificado"
        : info.source === "derived"
          ? "Datos del proveedor"
          : "Sin datos";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${color}`}
      title={info.notes}
    >
      Accesibilidad · {sourceLabel}
      {!info.verified && info.source !== "tur4all" ? (
        <span className="text-amber-700"> · sin verificar</span>
      ) : null}
    </span>
  );
}

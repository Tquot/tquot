"use client";

import { Eyebrow } from "@/components/ui/Eyebrow";
import type { AgencyAnalytics } from "@/lib/analytics/types";
import { useDashboardLanguage } from "@/app/dashboard/dashboard-language-provider";
import { formatMessage } from "@/app/dashboard/format-message";

const STAGE_KEYS = [
  { key: "draft" as const, tone: "bg-border-2", labelKey: "analyticsFunnelDraft" as const },
  { key: "awaiting" as const, tone: "bg-info", labelKey: "analyticsFunnelAwaiting" as const },
  { key: "won" as const, tone: "bg-success", labelKey: "analyticsFunnelWon" as const },
  { key: "expired" as const, tone: "bg-warning", labelKey: "analyticsFunnelExpired" as const },
  { key: "cancelled" as const, tone: "bg-danger", labelKey: "analyticsFunnelCancelled" as const },
];

export function FunnelBlock({
  funnel,
  conversion,
}: {
  funnel: AgencyAnalytics["funnel"];
  conversion: AgencyAnalytics["conversion"];
}) {
  const { t } = useDashboardLanguage();
  const total = Object.values(funnel).reduce((s, n) => s + n, 0);
  if (total === 0) return null;

  const deltaRate =
    conversion.rate_pct != null && conversion.prev_rate_pct != null
      ? conversion.rate_pct - conversion.prev_rate_pct
      : null;

  return (
    <section>
      <Eyebrow className="block mb-4">{t.analyticsFunnelTitle}</Eyebrow>

      <div className="mb-6">
        <div className="flex items-baseline gap-3">
          <span
            className="font-serif text-[48px] leading-none text-ink tabular-nums"
            style={{ fontWeight: 500 }}
          >
            {conversion.rate_pct != null ? `${conversion.rate_pct}` : "—"}
          </span>
          <span className="text-h3 text-text-2">%</span>
          {deltaRate != null && deltaRate !== 0 && (
            <span
              className={`text-body-sm font-mono ${
                deltaRate > 0 ? "text-success" : "text-danger"
              }`}
            >
              {deltaRate > 0 ? "+" : ""}
              {deltaRate.toFixed(1)} pts
            </span>
          )}
        </div>
        <p className="mt-1 text-body-sm text-text-2">
          {formatMessage(t.analyticsFunnelClosedOfSent, {
            won: conversion.won,
            decidable: conversion.decidable,
          })}
        </p>
        <p className="mt-0.5 text-[11px] text-text-3">{t.analyticsFunnelHint}</p>
      </div>

      <div className="flex h-2 rounded-full overflow-hidden mb-4">
        {STAGE_KEYS.map((s) => {
          const n = funnel[s.key];
          if (n === 0) return null;
          return (
            <div
              key={s.key}
              className={s.tone}
              style={{ width: `${(n / total) * 100}%` }}
            />
          );
        })}
      </div>

      <dl className="space-y-2">
        {STAGE_KEYS.map((s) => {
          const n = funnel[s.key];
          if (n === 0) return null;
          return (
            <div key={s.key} className="flex items-center gap-3 text-body-sm">
              <span className={`w-2 h-2 rounded-full ${s.tone} shrink-0`} />
              <dt className="flex-1 text-text">{t[s.labelKey]}</dt>
              <dd className="font-mono text-ink tabular-nums">{n}</dd>
              <dd className="font-mono text-text-3 tabular-nums w-12 text-right">
                {Math.round((n / total) * 100)} %
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

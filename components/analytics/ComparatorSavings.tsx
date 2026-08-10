"use client";

import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { AgencyAnalytics } from "@/lib/analytics/types";
import { useDashboardLanguage } from "@/app/dashboard/dashboard-language-provider";
import { formatMessage } from "@/app/dashboard/format-message";

export function ComparatorSavings({
  comparator,
}: {
  comparator: AgencyAnalytics["comparator"];
}) {
  const { locale, t } = useDashboardLanguage();
  const localeTag = locale === "es" ? "es-ES" : "en-US";
  const coverage =
    comparator.total_quotes > 0
      ? Math.round((comparator.runs / comparator.total_quotes) * 100)
      : 0;

  return (
    <section>
      <Eyebrow className="block mb-4">{t.analyticsComparatorTitle}</Eyebrow>

      {comparator.runs === 0 ? (
        <div className="bg-paper-2 border border-border-1 rounded-lg p-5">
          <p className="text-body text-text leading-relaxed mb-3">
            {t.analyticsComparatorEmpty}
          </p>
          <Link
            href="/dashboard/new-quote"
            className="text-body-sm font-medium text-ink hover:text-accent transition-colors"
          >
            {t.analyticsComparatorTryCta}
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span
              className="font-serif text-[48px] leading-none text-accent tabular-nums"
              style={{ fontWeight: 500 }}
            >
              {Math.round(comparator.saving).toLocaleString(localeTag)}
            </span>
            <span className="text-h3 text-text-2">€</span>
          </div>
          <div className="h-0.5 w-12 bg-accent mt-3 mb-4" />

          <p className="text-body-sm text-text leading-relaxed">
            {formatMessage(t.analyticsComparatorRuns, {
              runs: comparator.runs,
              total: comparator.total_quotes,
            })}
          </p>
          <p className="mt-1 text-[11px] text-text-3 leading-relaxed max-w-[380px]">
            {t.analyticsComparatorHint}
          </p>

          {coverage < 50 && (
            <p className="mt-4 text-body-sm text-text-2 leading-relaxed border-l-2 border-border-2 pl-3">
              {formatMessage(t.analyticsComparatorLowCoverage, {
                coverage,
              })}
            </p>
          )}
        </>
      )}
    </section>
  );
}

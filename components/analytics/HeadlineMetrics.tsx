"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { AgencyAnalytics } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";
import { useDashboardLanguage } from "@/app/dashboard/dashboard-language-provider";
import { formatMessage } from "@/app/dashboard/format-message";

export function HeadlineMetrics({ data }: { data: AgencyAnalytics }) {
  const { locale, t } = useDashboardLanguage();
  const localeTag = locale === "es" ? "es-ES" : "en-US";

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-x-12 gap-y-8 items-start">
      <div>
        <div
          className="font-serif text-[56px] md:text-[88px] leading-none tracking-[-0.04em] text-ink tabular-nums"
          style={{ fontWeight: 500 }}
        >
          {data.quotes.count.toLocaleString(localeTag)}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-h3 text-text">{t.analyticsQuotes}</span>
          {data.quotes.delta_pct != null && data.quotes.delta_pct !== 0 && (
            <Delta value={data.quotes.delta_pct} />
          )}
        </div>
        <p className="mt-1 text-[12px] text-text-3">
          {formatMessage(t.analyticsQuotesPrev, {
            count: data.quotes.prev_count,
            days: data.range.days,
          })}
        </p>
      </div>

      <dl className="space-y-5">
        <Metric
          label={t.analyticsVolumeQuoted}
          value={fmtMoney(data.volume.quoted, localeTag)}
          hint={
            data.volume.delta_pct != null
              ? formatMessage(t.analyticsVsPrevPeriod, {
                  signed: signed(data.volume.delta_pct),
                })
              : undefined
          }
        />
        <Metric
          label={t.analyticsVolumeWon}
          value={fmtMoney(data.volume.won, localeTag)}
          hint={formatMessage(t.analyticsClosedQuotes, {
            count: data.conversion.won,
          })}
        />
        <Metric
          label={t.analyticsMarginWon}
          value={fmtMoney(data.volume.margin_won, localeTag)}
          hint={t.analyticsMarginHint}
        />
        <Metric
          label={t.analyticsAvgTicket}
          value={fmtMoney(data.volume.avg_ticket, localeTag)}
        />
        <Metric
          label={t.analyticsActiveClients}
          value={String(data.active_clients)}
          hint={t.analyticsActiveClientsHint}
        />
      </dl>
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-border-1 last:border-0">
      <dt className="min-w-0">
        <Eyebrow>{label}</Eyebrow>
        {hint && <p className="mt-1 text-[11px] text-text-3">{hint}</p>}
      </dt>
      <dd className="font-mono text-h2 text-ink tabular-nums shrink-0">{value}</dd>
    </div>
  );
}

function Delta({ value }: { value: number }) {
  const positive = value > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-body-sm font-mono tabular-nums",
        positive ? "text-success" : "text-danger",
      )}
    >
      <Icon size={13} strokeWidth={1.5} />
      {signed(value)} %
    </span>
  );
}

function fmtMoney(n: number, localeTag: string): string {
  return `${Math.round(n).toLocaleString(localeTag)} €`;
}

function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${n}`;
}

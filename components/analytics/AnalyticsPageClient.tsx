"use client";

import { Eyebrow } from "@/components/ui/Eyebrow";
import type { AgencyAnalytics, RangePreset } from "@/lib/analytics/types";
import { useDashboardLanguage } from "@/app/dashboard/dashboard-language-provider";
import { RangeSelector } from "@/components/analytics/RangeSelector";
import { HeadlineMetrics } from "@/components/analytics/HeadlineMetrics";
import { ActivityChart } from "@/components/analytics/ActivityChart";
import { FunnelBlock } from "@/components/analytics/FunnelBlock";
import { ComparatorSavings } from "@/components/analytics/ComparatorSavings";
import { DestinationsTable } from "@/components/analytics/DestinationsTable";
import { ProvidersTable } from "@/components/analytics/ProvidersTable";

export function AnalyticsPageClient({
  data,
  preset,
  empty,
}: {
  data: AgencyAnalytics;
  preset: RangePreset;
  empty: boolean;
}) {
  const { t } = useDashboardLanguage();

  return (
    <div className="max-w-[1080px] mx-auto px-6 py-10 space-y-12">
      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <Eyebrow className="block mb-2">{t.analyticsEyebrow}</Eyebrow>
          <h1
            className="font-serif text-h1 text-ink"
            style={{ fontWeight: 500 }}
          >
            {t.analyticsTitle}
          </h1>
        </div>
        <RangeSelector current={preset} />
      </header>

      {empty ? (
        <EmptyState />
      ) : (
        <>
          <HeadlineMetrics data={data} />
          <Divider />
          <ActivityChart daily={data.daily} />
          <Divider />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <FunnelBlock funnel={data.funnel} conversion={data.conversion} />
            <ComparatorSavings comparator={data.comparator} />
          </div>
          <Divider />
          <DestinationsTable destinations={data.destinations} />
          <Divider />
          <ProvidersTable providers={data.providers} />
        </>
      )}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border-1" />;
}

function EmptyState() {
  const { t } = useDashboardLanguage();
  return (
    <div className="py-16 text-center">
      <p className="font-serif text-h2 text-ink mb-3" style={{ fontWeight: 500 }}>
        {t.analyticsEmptyTitle}
      </p>
      <p className="text-body text-text-2 max-w-[420px] mx-auto">
        {t.analyticsEmptyBody}
      </p>
    </div>
  );
}

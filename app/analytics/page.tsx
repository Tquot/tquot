import type { RangePreset } from "@/lib/analytics/types";
import { loadAnalytics } from "@/lib/analytics/load";
import { getCurrentAgencyId } from "@/lib/auth";
import { AnalyticsPageClient } from "@/components/analytics/AnalyticsPageClient";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const preset = (params.range ?? "30d") as RangePreset;
  const agencyId = await getCurrentAgencyId();
  if (!agencyId) return null;

  const data = await loadAnalytics(agencyId, preset);
  const empty = data.quotes.count === 0;

  return (
    <AnalyticsPageClient data={data} preset={preset} empty={empty} />
  );
}

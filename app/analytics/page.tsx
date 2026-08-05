import { Eyebrow } from "@/components/ui/Eyebrow";
import type { RangePreset } from "@/lib/analytics/types";
import { loadAnalytics } from "@/lib/analytics/load";
import { getCurrentAgencyId } from "@/lib/auth";
import { RangeSelector } from "@/components/analytics/RangeSelector";
import { HeadlineMetrics } from "@/components/analytics/HeadlineMetrics";
import { ActivityChart } from "@/components/analytics/ActivityChart";
import { FunnelBlock } from "@/components/analytics/FunnelBlock";
import { ComparatorSavings } from "@/components/analytics/ComparatorSavings";
import { DestinationsTable } from "@/components/analytics/DestinationsTable";
import { ProvidersTable } from "@/components/analytics/ProvidersTable";

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
    <div className="max-w-[1080px] mx-auto px-6 py-10 space-y-12">
      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <Eyebrow className="block mb-2">Analítica</Eyebrow>
          <h1
            className="font-serif text-h1 text-ink"
            style={{ fontWeight: 500 }}
          >
            Cómo va tu agencia.
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
  return (
    <div className="py-16 text-center">
      <p className="font-serif text-h2 text-ink mb-3" style={{ fontWeight: 500 }}>
        Todavía no hay datos en este periodo.
      </p>
      <p className="text-body text-text-2 max-w-[420px] mx-auto">
        En cuanto empieces a cotizar aparecerán aquí el volumen, la conversión
        y los destinos que más trabajas.
      </p>
    </div>
  );
}


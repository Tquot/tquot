import { Eyebrow } from "@/components/ui/Eyebrow";
import { HeroMetric } from "@/components/dashboard/HeroMetric";
import { SecondaryMetrics } from "@/components/dashboard/SecondaryMetrics";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { RecentQuotesStrip } from "@/components/dashboard/RecentQuotesStrip";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { loadDashboardMetrics } from "@/lib/dashboard/loader";
import { listRecentQuotes } from "@/lib/quotes/recent";

export default async function DashboardPage() {
  const [metrics, recentQuotes] = await Promise.all([
    loadDashboardMetrics(),
    listRecentQuotes({ limit: 12 }),
  ]);

  return (
    <main className="mx-auto max-w-[1080px] px-6 py-10 sm:py-12">
      <div className="space-y-12">
        <section>
          <Eyebrow className="mb-6 block">
            {metrics.agencyName} · {formatMonth(new Date())}
          </Eyebrow>

          <div className="grid grid-cols-1 items-start gap-x-12 gap-y-8 lg:grid-cols-[auto_1fr]">
            <HeroMetric
              value={metrics.quotesThisMonth}
              label="Cotizaciones"
              delta={metrics.quotesDelta}
            />
            <SecondaryMetrics
              items={[
                {
                  label: "Total cotizado",
                  value: metrics.totalQuoted,
                  unit: metrics.currencySymbol,
                  format: "currency",
                },
                {
                  label: "Clientes activos",
                  value: metrics.activeClients,
                  format: "count",
                },
                {
                  label: "Conversión",
                  value: metrics.conversionRate,
                  unit: "%",
                  format: "percent",
                },
                {
                  label: "Ticket medio",
                  value: metrics.averageTicket,
                  unit: metrics.currencySymbol,
                  format: "currency",
                },
              ]}
            />
          </div>

          <div className="mt-8">
            <Sparkline data={metrics.last30Days} label="Últimos 30 días" />
          </div>
        </section>

        <Divider />

        <section>
          <Eyebrow className="mb-4 block">Últimas cotizaciones</Eyebrow>
          <RecentQuotesStrip quotes={recentQuotes} />
        </section>

        <Divider />

        <section>
          <Eyebrow className="mb-4 block">Atajos</Eyebrow>
          <QuickActions />
        </section>
      </div>
    </main>
  );
}

function Divider() {
  return <div className="h-px bg-border-1" />;
}

function formatMonth(date: Date): string {
  return date
    .toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    .toUpperCase();
}

import { Eyebrow } from "@/components/ui/Eyebrow";
import { HeroMetric } from "@/components/dashboard/HeroMetric";
import { SecondaryMetrics } from "@/components/dashboard/SecondaryMetrics";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { RecentQuotesStrip } from "@/components/dashboard/RecentQuotesStrip";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { SecondaryQuickLinks } from "@/components/dashboard/SecondaryQuickLinks";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { DemoModeCard } from "@/components/onboarding/DemoModeCard";
import Link from "next/link";
import { loadDashboardMetrics } from "@/lib/dashboard/loader";
import { listRecentQuotes } from "@/lib/quotes/recent";
import { getOrCreateOnboarding } from "@/lib/onboarding/progress";
import { ONBOARDING_STEPS } from "@/lib/onboarding/steps";
import { stepPath } from "@/lib/onboarding/progress";

export default async function DashboardPage() {
  const [metrics, recentQuotes, onboarding] = await Promise.all([
    loadDashboardMetrics(),
    listRecentQuotes({ limit: 12 }),
    getOrCreateOnboarding(),
  ]);

  const completed = new Set(onboarding?.completed_steps ?? []);
  const checklistItems = ONBOARDING_STEPS.filter((s) => s !== "complete").map(
    (step) => ({
      key: step,
      label:
        step === "welcome"
          ? "Bienvenida"
          : step === "identity"
            ? "Identidad de agencia"
            : step === "providers"
              ? "Conectar proveedor"
              : step === "first-quote"
                ? "Primera cotización"
                : "Inventario propio",
      href: stepPath(step),
      done: completed.has(step),
    }),
  );
  const showChecklist =
    !onboarding ||
    !(onboarding.completed_steps ?? []).includes("complete");

  return (
    <main className="mx-auto max-w-[1080px] px-6 py-10 sm:py-12">
      <div className="space-y-12">
        {showChecklist ? (
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <OnboardingChecklist items={checklistItems} />
            <DemoModeCard />
          </div>
        ) : null}

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

          <div className="mt-6 rounded-xl border border-border-2 bg-paper-2 p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <Eyebrow className="block mb-2">Analítica</Eyebrow>
                <p className="text-body-sm text-text-2">
                  Conversión {metrics.conversionRate}% · Ticket medio{" "}
                  {metrics.averageTicket.toLocaleString("es-ES")}{" "}
                  {metrics.currencySymbol}
                </p>
              </div>
              <Link
                href="/analytics?range=month"
                className="inline-flex h-9 items-center rounded-md bg-ink px-4 text-body-sm font-medium text-paper transition-colors hover:bg-ink-2"
              >
                Ver analítica →
              </Link>
            </div>
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

        <section>
          <Eyebrow className="mb-3 block">Más accesos</Eyebrow>
          <SecondaryQuickLinks />
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

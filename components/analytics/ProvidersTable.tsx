"use client";

import { Eyebrow } from "@/components/ui/Eyebrow";
import type { AgencyAnalytics } from "@/lib/analytics/types";
import { useDashboardLanguage } from "@/app/dashboard/dashboard-language-provider";
import { formatMessage } from "@/app/dashboard/format-message";

const PROVIDER_NAMES: Record<string, string> = {
  hotelbeds: "Hotelbeds",
  booking: "Booking.com",
  duffel: "Duffel",
  ratehawk: "RateHawk",
  viator: "Viator",
  civitatis: "Civitatis",
  battleface: "Battleface",
};

export function ProvidersTable({
  providers,
}: {
  providers: AgencyAnalytics["providers"];
}) {
  const { locale, t } = useDashboardLanguage();
  if (providers.length === 0) return null;

  function providerLabel(name: string) {
    if (name === "own") return t.analyticsProviderOwn;
    return PROVIDER_NAMES[name] ?? name;
  }

  const lowPerformers = providers.filter(
    (p) => p.appearances >= 10 && p.win_rate_pct < 10,
  );

  const joiner = locale === "es" ? " y " : " and ";

  return (
    <section>
      <Eyebrow className="block mb-1">{t.analyticsProvidersTitle}</Eyebrow>
      <p className="text-[12px] text-text-3 mb-5">
        {t.analyticsProvidersSubtitle}
      </p>

      <div className="border-t border-border-2">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 py-2.5 border-b border-border-2">
          <span className="eyebrow">{t.analyticsColProvider}</span>
          <span className="eyebrow text-right w-24">{t.analyticsColAppearances}</span>
          <span className="eyebrow text-right w-20">{t.analyticsColChosen}</span>
          <span className="eyebrow text-right w-20">{t.analyticsColRatio}</span>
        </div>

        {providers.map((p) => (
          <div
            key={p.name}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-4 py-3 border-b border-border-1 items-baseline"
          >
            <span
              className="font-serif text-[17px] text-ink"
              style={{ fontWeight: 500 }}
            >
              {providerLabel(p.name)}
            </span>
            <span className="font-mono text-mono-md text-text-2 tabular-nums text-right w-24">
              {p.appearances}
            </span>
            <span className="font-mono text-mono-md text-ink tabular-nums text-right w-20">
              {p.chosen}
            </span>
            <span className="font-mono text-mono-md text-text-2 tabular-nums text-right w-20">
              {p.win_rate_pct} %
            </span>
          </div>
        ))}
      </div>

      {lowPerformers.length > 0 && (
        <p className="mt-4 text-body-sm text-text-2 leading-relaxed border-l-2 border-border-2 pl-3">
          {lowPerformers.length === 1
            ? formatMessage(t.analyticsProvidersLowSingle, {
                name: providerLabel(lowPerformers[0].name),
              })
            : formatMessage(t.analyticsProvidersLowPlural, {
                names: lowPerformers.map((p) => providerLabel(p.name)).join(joiner),
              })}
        </p>
      )}
    </section>
  );
}

import type { DashboardTranslation } from "@/app/dashboard/translations";
import { SectionIntro } from "./section-intro";

type Props = { t: DashboardTranslation };

const FLIGHTS = [
  { code: "VY", airline: "Vueling", dep: "08:15", arr: "10:30", price: "€187", direct: true, selected: true },
  { code: "IB", airline: "Iberia", dep: "11:40", arr: "13:55", price: "€214", direct: true, selected: false },
  { code: "FR", airline: "Ryanair", dep: "16:20", arr: "18:35", price: "€156", direct: true, selected: false },
  { code: "U2", airline: "easyJet", dep: "07:00", arr: "10:15", price: "€198", direct: false, selected: false },
] as const;

function RouteVisual() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base font-black text-tquot-navy">MAD</span>
      <span className="relative h-px w-10 bg-gradient-to-r from-tquot-teal to-tquot-teal/30">
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs text-tquot-teal" aria-hidden>
          ✈
        </span>
      </span>
      <span className="text-base font-black text-tquot-navy">ACE</span>
    </div>
  );
}

export function LandingAgentFlow({ t }: Props) {
  return (
    <section id="flow" className="scroll-mt-24 bg-tquot-surface py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionIntro
          eyebrow={t.landingFlowEyebrow}
          title={t.landingFlowTitle}
          subtitle={t.landingFlowSubtitle}
        />

        <div className="mt-12 grid gap-7 lg:grid-cols-2 lg:items-start">
          <div className="rounded-2xl border border-tquot-border bg-tquot-surface p-5 shadow-md sm:p-6">
            <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-tquot-teal">
              {t.landingFlowChatLabel}
            </p>
            <div className="flex flex-col gap-3">
              <div className="ml-auto max-w-[95%] rounded-2xl rounded-tr-sm border border-tquot-accent/15 bg-gradient-to-br from-tquot-accent/10 to-tquot-accent/5 px-4 py-3 text-sm leading-relaxed text-tquot-navy">
                {t.landingFlowMsgAgent1}
              </div>
              <div className="max-w-[95%] rounded-lg border border-tquot-teal/25 bg-tquot-teal/10 px-3 py-2 text-xs font-medium text-tquot-teal">
                {t.landingFlowMsgSysAnalyze}
              </div>
              <div className="max-w-[95%] rounded-2xl rounded-tl-sm border border-tquot-border bg-tquot-bg px-4 py-3 text-sm leading-relaxed text-tquot-text">
                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-tquot-teal">
                  {t.landingMockChatTquotLabel}
                </p>
                {t.landingFlowMsgTquot}
              </div>
              <div className="ml-auto max-w-[95%] rounded-2xl rounded-tr-sm border border-tquot-accent/15 bg-gradient-to-br from-tquot-accent/10 to-tquot-accent/5 px-4 py-3 text-sm text-tquot-navy">
                {t.landingFlowMsgAgent2}
              </div>
              <div className="max-w-[95%] rounded-lg border border-tquot-teal/25 bg-tquot-teal/10 px-3 py-2 text-xs font-medium text-tquot-teal">
                {t.landingFlowMsgSysReady}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-tquot-border bg-tquot-surface p-5 shadow-md sm:p-6">
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-tquot-accent">
              {t.landingFlowFlightsEyebrow}
            </p>
            <div className="overflow-x-auto rounded-xl border border-tquot-border">
              <table className="w-full min-w-[400px] text-left text-sm">
                <thead>
                  <tr className="border-b border-tquot-border bg-tquot-bg/80 text-[10px] font-bold uppercase tracking-wide text-tquot-muted">
                    <th className="px-3 py-2.5">{t.landingMockFlightColAirline}</th>
                    <th className="px-3 py-2.5">{t.landingMockFlightColRoute}</th>
                    <th className="px-3 py-2.5">{t.landingMockFlightColTime}</th>
                    <th className="px-3 py-2.5">{t.landingMockFlightColPrice}</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {FLIGHTS.map((flight) => (
                    <tr
                      key={flight.code}
                      className={`border-b border-tquot-border/80 last:border-0 ${
                        flight.selected ? "bg-tquot-teal/5" : ""
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-tquot-border bg-tquot-bg text-[11px] font-extrabold text-tquot-accent">
                            {flight.code}
                          </span>
                          <span className="font-semibold text-tquot-text">{flight.airline}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <RouteVisual />
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-bold text-tquot-text">{flight.dep}</span>
                        <span className="text-tquot-muted"> → {flight.arr}</span>
                      </td>
                      <td className="px-3 py-3 text-lg font-extrabold text-tquot-teal">
                        {flight.price}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              flight.direct
                                ? "border-emerald-200 bg-emerald-50 text-tquot-success"
                                : "border-amber-200 bg-amber-50 text-tquot-warm"
                            }`}
                          >
                            {flight.direct
                              ? t.landingFlowFlightDirect
                              : t.landingFlowFlightOneStop}
                          </span>
                          {flight.selected ? (
                            <span className="inline-block h-2 w-2 rounded-full bg-tquot-teal" />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2.5 text-xs text-tquot-muted">{t.landingFlowFlightsFootnote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

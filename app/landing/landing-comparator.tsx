import type { DashboardTranslation } from "@/app/dashboard/translations";
import { SectionIntro } from "./section-intro";

type Props = { t: DashboardTranslation };

type CompRow = {
  logo: string;
  logoClass: string;
  nameKey: keyof DashboardTranslation;
  subKey: keyof DashboardTranslation;
  total: string;
  perNight?: string;
  statusKey: keyof DashboardTranslation;
  statusClass: string;
  cheap?: boolean;
  disconnected?: boolean;
};

const ROWS: CompRow[] = [
  {
    logo: "HB",
    logoClass: "bg-tquot-teal/10 text-tquot-teal",
    nameKey: "landingCompRowHb",
    subKey: "landingCompSubNet",
    total: "€1.440",
    perNight: "€120",
    statusKey: "landingCompStatusOk",
    statusClass: "bg-emerald-50 text-tquot-success",
    cheap: true,
  },
  {
    logo: "📁",
    logoClass: "bg-amber-50 text-amber-900",
    nameKey: "landingCompRowOwn",
    subKey: "landingCompSubNegotiated",
    total: "€1.560",
    perNight: "€130",
    statusKey: "landingCompStatusOk",
    statusClass: "bg-emerald-50 text-tquot-success",
  },
  {
    logo: "BK",
    logoClass: "bg-blue-50 text-tquot-accent",
    nameKey: "landingCompRowBooking",
    subKey: "landingCompSubPublic",
    total: "€1.896",
    perNight: "€158",
    statusKey: "landingCompStatusOk",
    statusClass: "bg-emerald-50 text-tquot-success",
  },
  {
    logo: "RH",
    logoClass: "bg-slate-100 text-tquot-muted",
    nameKey: "landingConnectorRateHawk",
    subKey: "landingCompSubConnect",
    total: "—",
    statusKey: "landingCompStatusDisconnected",
    statusClass: "bg-slate-50 text-tquot-muted",
    disconnected: true,
  },
  {
    logo: "W2",
    logoClass: "bg-slate-100 text-tquot-muted",
    nameKey: "landingCompRowW2m",
    subKey: "landingCompSubConnect",
    total: "—",
    statusKey: "landingCompStatusDisconnected",
    statusClass: "bg-slate-50 text-tquot-muted",
    disconnected: true,
  },
];

export function LandingComparator({ t }: Props) {
  return (
    <section id="comparador" className="scroll-mt-24 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionIntro
          eyebrow={t.landingCompEyebrow}
          title={t.landingCompTitle}
          subtitle={t.landingCompSubtitle}
        />

        <div className="mx-auto mt-12 max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-tquot-border bg-tquot-surface px-4 py-3.5 shadow-sm">
            <div>
              <p className="text-sm font-bold text-tquot-navy">{t.landingCompHotelName}</p>
              <p className="text-xs text-tquot-muted">{t.landingCompHotelMeta}</p>
            </div>
            <span className="rounded-full border border-tquot-teal/30 bg-tquot-teal/10 px-3 py-1 text-xs font-semibold text-tquot-teal">
              {t.landingCompComparedIn}
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-tquot-border bg-tquot-surface shadow-lg">
            <div className="bg-gradient-to-br from-tquot-navy-deep to-[#1e3a5f] px-5 py-4 text-white sm:px-6">
              <h3 className="text-sm font-bold sm:text-base">{t.landingCompBoxTitle}</h3>
              <p className="mt-1 text-xs text-white/65">{t.landingCompBoxSubtitle}</p>
            </div>
            {ROWS.map((row) => (
              <div
                key={row.nameKey}
                className={`grid grid-cols-1 items-center gap-3 border-b border-tquot-border px-4 py-4 last:border-0 sm:grid-cols-[1fr_auto_auto_auto] sm:gap-4 sm:px-5 ${
                  row.cheap ? "bg-tquot-teal/5" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-tquot-border text-xs font-extrabold ${row.logoClass}`}
                  >
                    {row.logo}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-tquot-navy">
                      {t[row.nameKey]}
                      {row.cheap ? (
                        <span className="ml-2 rounded border border-tquot-teal/25 bg-tquot-teal/10 px-1.5 py-0.5 text-[9px] font-bold text-tquot-teal">
                          {t.landingCompCheapest}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-tquot-muted">{t[row.subKey]}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p
                    className={`text-lg font-extrabold ${row.cheap ? "text-tquot-teal" : "text-tquot-navy"}`}
                  >
                    {row.total}
                  </p>
                  {row.perNight ? (
                    <p className="text-[10px] text-tquot-muted">
                      {row.perNight}
                      {t.landingCompPerNight}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`inline-flex w-fit rounded-lg px-2.5 py-1 text-[11px] font-semibold ${row.statusClass}`}
                >
                  {t[row.statusKey]}
                </span>
                <button
                  type="button"
                  className={`w-fit rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap ${
                    row.disconnected
                      ? "bg-slate-100 text-tquot-muted"
                      : "bg-tquot-teal text-white hover:bg-[#00a884]"
                  }`}
                >
                  {row.disconnected ? t.landingCompBtnConnect : t.landingCompBtnUse}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-relaxed text-amber-950">
            {t.landingCompTip}
          </div>
        </div>
      </div>
    </section>
  );
}

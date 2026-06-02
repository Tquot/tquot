import type { DashboardTranslation } from "@/app/dashboard/translations";
import { SectionIntro } from "./section-intro";

type Props = { t: DashboardTranslation };

export function LandingPdf({ t }: Props) {
  const bullets = [
    t.landingPdfBullet1,
    t.landingPdfBullet2,
    t.landingPdfBullet3,
    t.landingPdfBullet4,
  ];

  const lines = [
    { section: t.landingPdfSecFlights, items: [t.landingPdfLineFlight1, t.landingPdfLineFlight2] },
    { section: t.landingPdfSecHotel, items: [t.landingPdfLineHotel] },
    { section: t.landingPdfSecExtras, items: [t.landingPdfLineExtra1, t.landingPdfLineExtra2, t.landingPdfLineExtra3] },
  ];

  return (
    <section id="pdf" className="scroll-mt-24 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <SectionIntro
              eyebrow={t.landingPdfEyebrow}
              title={t.landingPdfTitle}
              subtitle={t.landingPdfSubtitle}
            />
            <ul className="mt-8 space-y-3">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2.5 text-sm text-tquot-navy">
                  <span className="shrink-0 font-extrabold text-tquot-teal">✓</span>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-tquot-border bg-white shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-3 bg-tquot-navy px-6 py-5 text-white">
              <div>
                <p className="text-lg font-extrabold">{t.landingPdfAgencyName}</p>
                <p className="mt-1 text-xs text-white/55">{t.landingPdfRef}</p>
              </div>
              <span className="rounded-lg bg-tquot-teal/20 px-2 py-1 text-[10px] font-bold text-tquot-teal">
                {t.landingPdfClientVersion}
              </span>
            </div>
            <div className="space-y-5 p-6">
              {lines.map((block) => (
                <div key={block.section}>
                  <p className="border-b-2 border-tquot-teal pb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-tquot-teal">
                    {block.section}
                  </p>
                  <ul className="mt-2 space-y-0">
                    {block.items.map((line) => {
                      const [label, price] = line.split("|");
                      return (
                        <li
                          key={line}
                          className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm"
                        >
                          <span className="text-tquot-text">{label}</span>
                          <span className="shrink-0 font-bold">{price}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl bg-tquot-teal/10 px-4 py-3.5">
                <span className="font-semibold text-tquot-navy">{t.landingPdfTotalLabel}</span>
                <span className="text-2xl font-extrabold text-tquot-teal">€2.388</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

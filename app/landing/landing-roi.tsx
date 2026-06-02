import type { DashboardTranslation } from "@/app/dashboard/translations";

type Props = { t: DashboardTranslation };

export function LandingRoi({ t }: Props) {
  const cards = [
    { value: "45x", label: t.landingRoi1Label, sub: t.landingRoi1Sub },
    { value: "+€456", label: t.landingRoi2Label, sub: null },
    { value: "3x", label: t.landingRoi3Label, sub: null },
  ];

  return (
    <section id="roi" className="scroll-mt-24 bg-tquot-surface py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6 text-center lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-tquot-teal">
          {t.landingRoiEyebrow}
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-tquot-navy sm:text-4xl">
          {t.landingRoiTitle}
        </h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.value}
              className="rounded-2xl border border-tquot-border bg-white px-5 py-8 shadow-sm"
            >
              <p className="font-[family-name:var(--font-outfit)] text-4xl font-extrabold text-tquot-teal sm:text-5xl">
                {card.value}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-tquot-muted">{card.label}</p>
              {card.sub ? (
                <p className="mt-1 text-xs text-tquot-muted">{card.sub}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

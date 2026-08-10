"use client";

import { useSiteLanguage } from "@/app/language-provider";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function HowItWorks() {
  const { t } = useSiteLanguage();

  const STEPS = [
    {
      n: "01",
      title: t.landingStep1TitleUi,
      body: t.landingStep1DescUi,
    },
    {
      n: "02",
      title: t.landingStep2TitleUi,
      body: t.landingStep2DescUi,
    },
    {
      n: "03",
      title: t.landingStep3TitleUi,
      body: t.landingStep3Desc,
    },
  ];

  return (
    <section id="flujo" className="border-y border-border-1 bg-paper-2 py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">{t.landingHowEyebrowAlt}</Eyebrow>
        <h2 className="mb-12 max-w-[640px] font-serif text-h1 text-ink sm:mb-16" style={{ fontWeight: 500 }}>
          {t.landingHowLead}
        </h2>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <div key={step.n} className="space-y-4">
              <div className="font-mono text-[48px] leading-none text-umber tabular-nums" style={{ fontWeight: 500 }}>
                {step.n}
              </div>
              <h3 className="font-serif text-h2 leading-snug text-ink" style={{ fontWeight: 500 }}>
                {step.title}
              </h3>
              <p className="text-body leading-relaxed text-text">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

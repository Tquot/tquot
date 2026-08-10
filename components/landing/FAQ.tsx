"use client";

import { useSiteLanguage } from "@/app/language-provider";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function FAQ() {
  const { t } = useSiteLanguage();

  const QUESTIONS = [
    { q: t.landingFaq1Q, a: t.landingFaq1A },
    { q: t.landingFaq2Q, a: t.landingFaq2A },
    { q: t.landingFaq3Q, a: t.landingFaq3A },
    { q: t.landingFaq4Q, a: t.landingFaq4A },
  ];

  return (
    <section className="border-y border-border-1 bg-paper-2 py-14 sm:py-20">
      <div className="mx-auto max-w-[820px] px-5">
        <Eyebrow className="mb-3 block">{t.landingFaqTitle}</Eyebrow>
        <h2 className="mb-10 font-serif text-h1 text-ink" style={{ fontWeight: 500 }}>
          {t.landingFaqLead}
        </h2>
        <div className="border-t border-border-2">
          {QUESTIONS.map((item, index) => (
            <details key={item.q} className="group border-b border-border-1" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5">
                <span className="font-serif text-[18px] font-medium text-ink" style={{ fontWeight: 500 }}>
                  {item.q}
                </span>
                <span className="shrink-0 font-mono text-[16px] text-text-2 transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="-mt-2 max-w-[640px] pb-5 text-body leading-relaxed text-text">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

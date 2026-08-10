"use client";

import { useSiteLanguage } from "@/app/language-provider";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function HeroStatsTrio() {
  const { t } = useSiteLanguage();

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-16">
      <div className="grid grid-cols-3 gap-4 border-t border-border-2 pt-8 sm:gap-8">
        <div>
          <Eyebrow className="mb-3 block">{t.landingStatTimeEyebrow}</Eyebrow>
          <div className="flex items-baseline gap-2">
            <span className="text-[14px] text-text-2 line-through decoration-text-3/40 sm:text-[18px]">
              {t.landingStatTimeBefore}
            </span>
            <span className="text-text-3">→</span>
          </div>
          <div
            className="mt-1 font-serif text-[36px] leading-none tracking-[-0.025em] text-ink sm:text-[56px]"
            style={{ fontWeight: 500 }}
          >
            60
            <span className="ml-1.5 text-[18px] text-text-2 sm:text-[22px]">
              {t.landingStatTimeUnit}
            </span>
          </div>
        </div>
        <div>
          <Eyebrow className="mb-3 block">{t.landingStatQuotesEyebrow}</Eyebrow>
          <div
            className="mt-1 font-serif text-[36px] leading-none tracking-[-0.025em] text-ink sm:text-[56px]"
            style={{ fontWeight: 500 }}
          >
            3
            <span className="ml-1 text-[18px] text-text-2 sm:text-[22px]">
              ×
            </span>
          </div>
          <p className="mt-2 text-[12px] text-text-2 sm:text-[13px]">
            {t.landingStatQuotesSub}
          </p>
        </div>
        <div>
          <Eyebrow className="mb-3 block">{t.landingStatSavingsEyebrow}</Eyebrow>
          <div
            className="mt-1 font-serif text-[36px] leading-none tracking-[-0.025em] text-ink sm:text-[56px]"
            style={{ fontWeight: 500 }}
          >
            {t.landingStatSavingsValuePlain}
            <span className="ml-1 text-[18px] text-text-2 sm:text-[22px]">
              €
            </span>
          </div>
          <p className="mt-2 text-[12px] text-text-2 sm:text-[13px]">
            {t.landingStatSavingsSub}
          </p>
        </div>
      </div>
    </div>
  );
}

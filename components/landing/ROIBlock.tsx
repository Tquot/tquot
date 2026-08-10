"use client";

import { useSiteLanguage } from "@/app/language-provider";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function ROIBlock() {
  const { t } = useSiteLanguage();

  const ROI = [
    {
      value: t.landingRoi1Value,
      label: t.landingRoi1Label,
      hint: t.landingRoi1Hint,
    },
    {
      value: t.landingRoi2Value,
      label: t.landingRoi2LabelShort,
      hint: t.landingRoi2Hint,
    },
    {
      value: t.landingRoi3Value,
      label: t.landingRoi3LabelShort,
      hint: t.landingRoi3Hint,
    },
  ];

  return (
    <section className="bg-ink py-14 text-paper sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block text-paper/60">{t.landingRoiEyebrowShort}</Eyebrow>
        <h2 className="mb-12 max-w-[640px] font-serif text-h1 text-paper" style={{ fontWeight: 500 }}>
          {t.landingRoiTitle}
        </h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-12">
          {ROI.map((item, index) => (
            <div
              key={item.value}
              className={"space-y-2 " + (index < 2 ? "sm:border-r sm:border-paper/15 sm:pr-8" : "")}
            >
              <div
                className="font-serif text-[56px] leading-none tracking-[-0.025em] text-umber sm:text-[72px]"
                style={{ fontWeight: 500 }}
              >
                {item.value}
              </div>
              <p className="text-body font-medium text-paper">{item.label}</p>
              <p className="font-mono text-body-sm text-paper/60">{item.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

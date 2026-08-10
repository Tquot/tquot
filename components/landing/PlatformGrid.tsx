"use client";

import { useSiteLanguage } from "@/app/language-provider";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function PlatformGrid() {
  const { t } = useSiteLanguage();

  const FEATURES = [
    {
      title: t.landingFeature1Title,
      body: t.landingFeature1Desc,
    },
    {
      title: t.landingFeature2Title,
      body: t.landingFeature2Desc,
    },
    {
      title: t.landingFeature3Title,
      body: t.landingFeature3Desc,
    },
    {
      title: t.landingFeature4Title,
      body: t.landingFeature4Desc,
    },
    {
      title: t.landingFeature5Title,
      body: t.landingFeature5Desc,
    },
    {
      title: t.landingFeature6Title,
      body: t.landingFeature6Desc,
    },
  ];

  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">{t.landingFeaturesEyebrow}</Eyebrow>
        <h2 className="mb-12 max-w-[680px] font-serif text-h1 text-ink" style={{ fontWeight: 500 }}>
          {t.landingFeaturesTitleUi}
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-12 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title}>
              <h3 className="mb-2 font-serif text-h3 text-ink" style={{ fontWeight: 500 }}>
                {feature.title}
              </h3>
              <p className="text-body-sm leading-relaxed text-text-2">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

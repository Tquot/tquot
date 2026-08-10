"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/app/language-provider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { HeroStatsTrio } from "./HeroStatsTrio";

export function LandingHero() {
  const { t } = useSiteLanguage();

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-[1200px] px-5 pt-12 pb-12 sm:pt-20">
        <div className="max-w-[760px]">
          <Eyebrow className="mb-5 block">{t.landingBadge}</Eyebrow>
          <h1
            className="font-serif text-[40px] leading-[1.02] tracking-[-0.025em] text-ink sm:text-[64px] md:text-[80px]"
            style={{ fontWeight: 500 }}
          >
            {t.landingHeroTitleLine1}
            <br />
            {t.landingHeroTitleLine2Prefix}{" "}
            <span className="text-umber">{t.landingHeroTitleHighlight}</span>.
          </h1>
          <p className="mt-6 max-w-[600px] text-[17px] leading-[1.5] text-text sm:mt-8 sm:text-[20px]">
            {t.landingHeroSubtitleUi}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="#cta"
              className="inline-flex h-12 items-center justify-center rounded-md bg-ink px-5 text-body font-medium text-paper transition-colors hover:bg-ink-2"
            >
              {t.landingNavRequestAccess}
            </Link>
            <a
              href="#demo"
              className="inline-flex h-12 items-center justify-center rounded-md px-5 text-body font-medium text-ink transition-colors hover:bg-paper-2"
            >
              {t.landingCtaHowItWorksArrow}
            </a>
          </div>
          <p className="mt-5 font-mono text-mono-sm text-text-3">
            {t.landingHeroEarlyAccess}
          </p>
        </div>
      </div>
      <HeroStatsTrio />
    </section>
  );
}

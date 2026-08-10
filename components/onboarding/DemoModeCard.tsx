"use client";

import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useSiteLanguage } from "@/app/language-provider";

export function DemoModeCard() {
  const { t } = useSiteLanguage();

  return (
    <div className="rounded-lg border border-border-1 bg-paper p-5">
      <Eyebrow className="mb-2 block" tone="accent">
        {t.onboardingDemoModeEyebrow}
      </Eyebrow>
      <p className="text-body-sm text-text-2">{t.onboardingDemoModeBody}</p>
      <Link
        href="/dashboard/new-quote?demo=1"
        className="mt-3 inline-flex text-body-sm font-medium text-accent underline-offset-2 hover:underline"
      >
        {t.onboardingOpenDemoQuote}
      </Link>
    </div>
  );
}

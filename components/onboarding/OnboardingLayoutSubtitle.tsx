"use client";

import { useSiteLanguage } from "@/app/language-provider";

export function OnboardingLayoutSubtitle() {
  const { t } = useSiteLanguage();
  return (
    <span className="ml-3 text-body-sm text-text-3">
      {t.onboardingLayoutSubtitle}
    </span>
  );
}

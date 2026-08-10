"use client";

import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useSiteLanguage } from "@/app/language-provider";
import { formatMessage } from "@/app/dashboard/format-message";

interface Props {
  agencyName: string;
}

export function CompletionScreen({ agencyName }: Props) {
  const { t } = useSiteLanguage();
  const name = agencyName || t.onboardingYourAgency;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <Eyebrow className="mb-4 block" tone="accent">
          {t.onboardingCompleteEyebrow}
        </Eyebrow>
        <h1
          className="font-serif text-display-2 text-ink"
          style={{ fontWeight: 500 }}
        >
          {formatMessage(t.onboardingCompleteTitle, { name })}
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-text-2">
          {t.onboardingCompleteBody}
        </p>
      </div>

      <div className="h-0.5 w-16 bg-accent" />

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/new-quote"
          className="inline-flex h-12 items-center rounded-md bg-ink px-6 text-body font-medium text-paper hover:bg-ink-2"
        >
          {t.onboardingNewQuote}
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex h-12 items-center rounded-md border border-border-1 px-6 text-body text-ink"
        >
          {t.onboardingGoDashboard}
        </Link>
      </div>
    </div>
  );
}

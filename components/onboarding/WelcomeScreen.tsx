"use client";

import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useSiteLanguage } from "@/app/language-provider";

interface Props {
  onStartLive: () => void;
  onStartDemo: () => void;
}

export function WelcomeScreen({ onStartLive, onStartDemo }: Props) {
  const { t } = useSiteLanguage();
  const body = t.onboardingWelcomeBody;
  const accent = t.onboardingWelcomeBodyAccent;
  const accentIdx = body.indexOf(accent);
  const before = accentIdx >= 0 ? body.slice(0, accentIdx) : body;
  const after = accentIdx >= 0 ? body.slice(accentIdx + accent.length) : "";

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <Eyebrow className="mb-4 block">{t.onboardingWelcomeEyebrow}</Eyebrow>
        <h1
          className="font-serif text-display-2 text-ink"
          style={{ fontWeight: 500 }}
        >
          {t.onboardingWelcomeTitle}
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-text-2">
          {before}
          {accentIdx >= 0 ? (
            <span className="text-accent">{accent}</span>
          ) : null}
          {after}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onStartLive}
          className="inline-flex h-12 items-center justify-center rounded-md bg-ink px-6 text-body font-medium text-paper transition-colors hover:bg-ink-2"
        >
          {t.onboardingStartSetup}
        </button>
        <button
          type="button"
          onClick={onStartDemo}
          className="inline-flex h-12 items-center justify-center rounded-md border border-border-2 px-6 text-body font-medium text-ink transition-colors hover:border-border-3"
        >
          {t.onboardingTryDemo}
        </button>
      </div>

      <p className="text-body-sm text-text-3">
        {t.onboardingAlreadyConfigured}{" "}
        <Link href="/dashboard" className="text-accent underline-offset-2 hover:underline">
          {t.onboardingGoDashboard}
        </Link>
      </p>
    </div>
  );
}

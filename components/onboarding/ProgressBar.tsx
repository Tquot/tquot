"use client";

import { cn } from "@/lib/utils";
import type { OnboardingStep } from "@/lib/onboarding/steps";
import { ONBOARDING_STEPS } from "@/lib/onboarding/steps";
import { useSiteLanguage } from "@/app/language-provider";

const LABELS: Record<OnboardingStep, string> = {
  welcome: "01",
  identity: "02",
  providers: "03",
  "first-quote": "04",
  inventory: "05",
  complete: "06",
};

interface Props {
  current: OnboardingStep;
}

export function ProgressBar({ current }: Props) {
  const { t } = useSiteLanguage();
  const currentIndex = ONBOARDING_STEPS.indexOf(current);

  return (
    <nav aria-label={t.onboardingProgressAria} className="mb-10">
      <ol className="flex items-center gap-2">
        {ONBOARDING_STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={step} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-medium",
                  active && "bg-accent text-paper",
                  done && "bg-ink text-paper",
                  !active && !done && "bg-paper-3 text-text-3",
                )}
              >
                {LABELS[step]}
              </span>
              {index < ONBOARDING_STEPS.length - 1 ? (
                <span
                  className={cn(
                    "h-px flex-1",
                    index < currentIndex ? "bg-ink" : "bg-border-1",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { DashboardTranslation } from "@/app/dashboard/translations";
import { useDashboardLanguage } from "@/app/dashboard/dashboard-language-provider";

interface ChecklistItem {
  key: string;
  href: string;
  done: boolean;
  label?: string;
}

interface Props {
  items: ChecklistItem[];
}

function checklistLabel(key: string, t: DashboardTranslation): string {
  switch (key) {
    case "welcome":
      return t.onboardingChecklistWelcome;
    case "identity":
      return t.onboardingChecklistIdentity;
    case "providers":
      return t.onboardingChecklistProviders;
    case "first-quote":
      return t.onboardingChecklistFirstQuote;
    case "inventory":
      return t.onboardingChecklistInventory;
    default:
      return key;
  }
}

export function OnboardingChecklist({ items }: Props) {
  const { t } = useDashboardLanguage();
  const remaining = items.filter((i) => !i.done);
  if (remaining.length === 0) return null;

  return (
    <section className="rounded-lg border border-border-1 bg-paper-2 p-5">
      <Eyebrow className="mb-3 block" tone="accent">
        {t.onboardingChecklistEyebrow}
      </Eyebrow>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-3">
            <span
              className={
                item.done
                  ? "text-body-sm text-text-3 line-through"
                  : "text-body-sm text-ink"
              }
            >
              {item.label ?? checklistLabel(item.key, t)}
            </span>
            {!item.done ? (
              <Link
                href={item.href}
                className="text-body-sm text-accent underline-offset-2 hover:underline"
              >
                {t.onboardingChecklistComplete}
              </Link>
            ) : (
              <span className="text-body-sm text-success">
                {t.onboardingChecklistDone}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

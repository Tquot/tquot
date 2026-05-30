"use client";

import { useDashboardLanguage } from "./dashboard-language-provider";
import type { Locale } from "./translations";

export function LocaleToggleButtons({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useDashboardLanguage();

  return (
    <div
      className={`flex rounded-lg border border-tquot-border bg-tquot-bg p-0.5 ${className}`}
    >
      {(["es", "en"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
            locale === code
              ? "bg-tquot-surface text-tquot-accent shadow-sm"
              : "text-tquot-muted hover:text-tquot-text"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

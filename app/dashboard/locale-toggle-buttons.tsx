"use client";

import { useDashboardLanguage } from "./dashboard-language-provider";
import type { Locale } from "./translations";

type LocaleToggleButtonsProps = {
  className?: string;
  variant?: "light" | "dark";
};

export function LocaleToggleButtons({
  className = "",
  variant = "light",
}: LocaleToggleButtonsProps) {
  const { locale, setLocale } = useDashboardLanguage();
  const isDark = variant === "dark";

  return (
    <div
      className={`flex rounded-lg border p-0.5 ${
        isDark
          ? "border-white/20 bg-white/10"
          : "border-tquot-border bg-tquot-bg"
      } ${className}`}
    >
      {(["es", "en"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
            locale === code
              ? isDark
                ? "bg-white/20 text-white shadow-sm"
                : "bg-tquot-surface text-tquot-accent shadow-sm"
              : isDark
                ? "text-white/70 hover:text-white"
                : "text-tquot-muted hover:text-tquot-text"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

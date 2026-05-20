"use client";

import { useDashboardLanguage } from "./dashboard-language-provider";
import type { Locale } from "./translations";

export function LocaleToggleButtons({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useDashboardLanguage();

  return (
    <div
      className={`flex rounded-full border border-white/10 bg-[#03080F]/60 p-1 shadow-inner shadow-black/30 ${className}`}
    >
      {(["es", "en"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
            locale === code
              ? "bg-[#00C9A7] text-[#03080F]"
              : "text-[#8B9CB3] hover:text-white"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

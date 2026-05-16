"use client";

import { useEffect, useState } from "react";
import {
  LOCALE_CHANGE_EVENT,
  readLocale,
  writeLocale,
} from "./locale";
import type { Locale } from "./translations";

export function LanguageToggle() {
  const [locale, setLocale] = useState<Locale>("es");

  useEffect(() => {
    setLocale(readLocale());

    const onLocaleChange = (event: Event) => {
      const detail = (event as CustomEvent<Locale>).detail;
      if (detail === "es" || detail === "en") {
        setLocale(detail);
      }
    };

    window.addEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
    return () =>
      window.removeEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
  }, []);

  function selectLanguage(next: Locale) {
    setLocale(next);
    writeLocale(next);
  }

  return (
    <div className="flex rounded-full border border-white/10 bg-white/[0.04] p-0.5">
      {(["es", "en"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => selectLanguage(code)}
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

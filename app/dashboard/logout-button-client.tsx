"use client";

import { useEffect, useState } from "react";
import { logoutAction } from "./actions";
import { LOCALE_CHANGE_EVENT, readLocale } from "./locale";
import { type Locale, translations } from "./translations";

export function LogoutButtonClient() {
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

  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-medium text-[#E8EEF7] transition-colors hover:border-[#00C9A7]/40 hover:bg-[#00C9A7]/10 hover:text-[#00C9A7]"
      >
        {translations[locale].logout}
      </button>
    </form>
  );
}

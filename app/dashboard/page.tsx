"use client";

import { useEffect, useState } from "react";
import { DashboardHome } from "./dashboard-home";
import { useDashboardEmail } from "./dashboard-email-context";
import { LOCALE_CHANGE_EVENT, readLocale } from "./locale";
import { type Locale, translations } from "./translations";

export default function DashboardPage() {
  const email = useDashboardEmail();
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

  const t = translations[locale];

  return <DashboardHome email={email} t={t} />;
}

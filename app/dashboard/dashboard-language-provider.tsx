"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LOCALE_CHANGE_EVENT, readLocale, writeLocale } from "./locale";
import { type Locale, translations } from "./translations";

type DashboardTranslation = (typeof translations)[Locale];

type DashboardLanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: DashboardTranslation;
};

const DashboardLanguageContext =
  createContext<DashboardLanguageContextValue | null>(null);

export function DashboardLanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window !== "undefined" ? readLocale() : "es",
  );

  useEffect(() => {
    const onLocaleChange = (event: Event) => {
      const detail = (event as CustomEvent<Locale>).detail;
      if (detail === "es" || detail === "en") {
        setLocaleState(detail);
      }
    };

    window.addEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    writeLocale(nextLocale);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: translations[locale],
    }),
    [locale, setLocale],
  );

  return (
    <DashboardLanguageContext.Provider value={value}>
      {children}
    </DashboardLanguageContext.Provider>
  );
}

export function useDashboardLanguage() {
  const context = useContext(DashboardLanguageContext);

  if (!context) {
    throw new Error(
      "useDashboardLanguage must be used within DashboardLanguageProvider",
    );
  }

  return context;
}

export type { DashboardTranslation };

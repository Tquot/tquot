"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { readLocale, writeLocale } from "./locale";
import { type Locale, translations } from "./translations";

type DashboardLanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (typeof translations)["es"];
};

const DashboardLanguageContext =
  createContext<DashboardLanguageContextValue | null>(null);

export function DashboardLanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    setLocaleState(readLocale());
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

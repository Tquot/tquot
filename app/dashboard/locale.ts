import type { Locale } from "./translations";

export const LOCALE_STORAGE_KEY = "tquot-locale";
export const LOCALE_CHANGE_EVENT = "tquot-locale-change";

export function readLocale(): Locale {
  if (typeof window === "undefined") return "es";
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored === "en" ? "en" : "es";
}

export function writeLocale(locale: Locale) {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  window.dispatchEvent(
    new CustomEvent(LOCALE_CHANGE_EVENT, { detail: locale }),
  );
}

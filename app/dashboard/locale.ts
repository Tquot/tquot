import type { Locale } from "./translations";

export const LOCALE_STORAGE_KEY = "tquot-locale";
export const LOCALE_CHANGE_EVENT = "tquot-locale-change";

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "es";
  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  const prefersEnglish = languages.some((lang) =>
    lang.toLowerCase().startsWith("en"),
  );
  return prefersEnglish ? "en" : "es";
}

export function readLocale(): Locale {
  if (typeof window === "undefined") return "es";
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === "en" || stored === "es") return stored;
  return detectBrowserLocale();
}

export function writeLocale(locale: Locale) {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  window.dispatchEvent(
    new CustomEvent(LOCALE_CHANGE_EVENT, { detail: locale }),
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LOCALE_CHANGE_EVENT, readLocale } from "../locale";
import { type Locale, translations } from "../translations";

export function NewQuoteForm() {
  const [locale, setLocale] = useState<Locale>("es");
  const [request, setRequest] = useState("");

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

  function handleGenerate() {
    // Quote generation will be wired up in a future step.
  }

  return (
    <>
      <Link
        href="/dashboard"
        className="mb-8 inline-flex items-center text-sm text-[#8B9CB3] transition-colors hover:text-[#00C9A7]"
      >
        ← {t.backToDashboard}
      </Link>

      <section className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {t.newQuotePageTitle}
        </h1>
        <p className="mt-2 text-[#8B9CB3]">{t.newQuotePageSubtitle}</p>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm sm:p-8">
        <label
          htmlFor="client-request"
          className="mb-3 block text-sm font-medium text-[#E8EEF7]"
        >
          {t.clientRequestLabel}
        </label>
        <textarea
          id="client-request"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder={t.clientRequestPlaceholder}
          rows={10}
          className="w-full resize-y rounded-xl border border-white/10 bg-[#03080F]/60 px-4 py-3 text-[#E8EEF7] placeholder:text-[#8B9CB3]/50 outline-none transition-colors focus:border-[#00C9A7]/50 focus:ring-2 focus:ring-[#00C9A7]/20"
        />

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!request.trim()}
            className="rounded-xl bg-[#00C9A7] px-8 py-3 text-sm font-semibold text-[#03080F] shadow-[0_0_32px_-8px_rgba(0,201,167,0.5)] transition-all hover:bg-[#00E5BB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.generateQuote}
          </button>
        </div>
      </section>
    </>
  );
}

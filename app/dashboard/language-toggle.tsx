"use client";

import Link from "next/link";
import { logoutAction } from "./actions";
import { useDashboardLanguage } from "./dashboard-language-provider";
import { type Locale, translations } from "./translations";

const STAT_VALUES = ["0", "0", "1", "0"] as const;

type LanguageToggleProps = {
  email: string;
};

function getGreeting(locale: Locale) {
  const hour = new Date().getHours();
  const t = translations[locale];

  if (hour < 12) return t.greetingMorning;
  if (hour < 20) return t.greetingAfternoon;
  return t.greetingEvening;
}

export function LanguageToggle({ email }: LanguageToggleProps) {
  const { locale, setLocale, t } = useDashboardLanguage();
  const stats = [
    { id: "today", label: t.statsToday, value: STAT_VALUES[0] },
    { id: "month", label: t.statsMonth, value: STAT_VALUES[1] },
    { id: "agencies", label: t.statsAgencies, value: STAT_VALUES[2] },
    { id: "pdfs", label: t.statsPdfs, value: STAT_VALUES[3] },
  ];

  return (
    <div className="relative min-h-screen bg-[#03080F] text-[#E8EEF7]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(0,201,167,0.12),transparent)]"
        aria-hidden
      />

      <header className="relative border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#00C9A7] text-lg font-extrabold text-[#03080F] shadow-[0_0_20px_-4px_rgba(0,201,167,0.5)]">
              Q
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              T<span className="text-[#00C9A7]">Quot</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden max-w-[200px] truncate text-sm text-[#8B9CB3] sm:block">
              {email}
            </span>

            <div className="flex rounded-full border border-white/10 bg-white/[0.04] p-0.5">
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

            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-medium text-[#E8EEF7] transition-colors hover:border-[#00C9A7]/40 hover:bg-[#00C9A7]/10 hover:text-[#00C9A7]"
              >
                {t.logout}
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 py-10 sm:py-12">
        <section className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {getGreeting(locale)},{" "}
            <span className="text-[#00C9A7]">{email}</span>
          </h1>
          <p className="mt-2 text-[#8B9CB3]">{t.subtitle}</p>
        </section>

        <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm"
            >
              <p className="text-sm font-medium text-[#8B9CB3]">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        <section className="mb-14 flex justify-center">
          <Link
            href="/dashboard/new-quote"
            className="rounded-2xl bg-[#00C9A7] px-12 py-5 text-lg font-semibold text-[#03080F] shadow-[0_0_48px_-8px_rgba(0,201,167,0.55)] transition-all hover:scale-[1.02] hover:bg-[#00E5BB] hover:shadow-[0_0_56px_-8px_rgba(0,201,167,0.7)]"
          >
            {t.newQuote}
          </Link>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">
            {t.recentRequests}
          </h2>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-14 text-center backdrop-blur-sm">
            <p className="text-[#8B9CB3]">{t.noRequests}</p>
          </div>
        </section>
      </main>
    </div>
  );
}

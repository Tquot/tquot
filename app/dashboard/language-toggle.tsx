"use client";

import Link from "next/link";
import { logoutAction } from "./actions";
import { useDashboardLanguage } from "./dashboard-language-provider";
import { LocaleToggleButtons } from "./locale-toggle-buttons";
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

const navLinkClass =
  "hidden rounded-lg px-3 py-2 text-sm font-medium text-tquot-muted transition-colors hover:bg-tquot-bg hover:text-tquot-accent md:inline-flex";

export function LanguageToggle({ email }: LanguageToggleProps) {
  const { locale, t } = useDashboardLanguage();
  const stats = [
    { id: "today", label: t.statsToday, value: STAT_VALUES[0] },
    { id: "month", label: t.statsMonth, value: STAT_VALUES[1] },
    { id: "agencies", label: t.statsAgencies, value: STAT_VALUES[2] },
    { id: "pdfs", label: t.statsPdfs, value: STAT_VALUES[3] },
  ];

  return (
    <div className="min-h-screen bg-tquot-bg text-tquot-text">
      <header className="sticky top-0 z-10 border-b border-tquot-border bg-tquot-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tquot-teal text-sm font-bold text-white">
              Q
            </span>
            <span className="text-lg font-semibold tracking-tight text-tquot-text">
              T<span className="text-tquot-accent">Quot</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/dashboard/inventory" className={navLinkClass}>
              {t.inventory}
            </Link>
            <Link href="/dashboard/integrations" className={navLinkClass}>
              Integraciones
            </Link>
            <Link href="/dashboard/agency" className={navLinkClass}>
              {t.agency}
            </Link>

            <span className="mx-2 hidden h-5 w-px bg-tquot-border sm:block" aria-hidden />

            <span className="hidden max-w-[180px] truncate text-sm text-tquot-muted lg:block">
              {email}
            </span>

            <LocaleToggleButtons />

            <form action={logoutAction} className="ml-1">
              <button
                type="submit"
                className="rounded-lg border border-tquot-border bg-tquot-surface px-4 py-2 text-sm font-medium text-tquot-muted transition-colors hover:border-tquot-border hover:bg-tquot-bg hover:text-tquot-text"
              >
                {t.logout}
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
        <section className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-tquot-text sm:text-3xl">
            {getGreeting(locale)},{" "}
            <span className="text-tquot-accent">{email.split("@")[0]}</span>
          </h1>
          <p className="mt-2 text-tquot-muted">{t.subtitle}</p>
        </section>

        <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="rounded-xl border border-tquot-border bg-tquot-surface p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-tquot-muted">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold text-tquot-text">
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        <section className="mb-14 flex justify-center">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/new-quote"
              className="rounded-xl bg-tquot-teal px-10 py-4 text-center text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#00b396]"
            >
              {t.newQuote}
            </Link>
            <Link
              href="/dashboard/agency"
              className="rounded-xl border border-tquot-border bg-tquot-surface px-10 py-4 text-center text-base font-semibold text-tquot-text shadow-sm transition-colors hover:border-tquot-accent/30 hover:text-tquot-accent"
            >
              {t.agency}
            </Link>
            <Link
              href="/dashboard/inventory"
              className="rounded-xl border border-tquot-border bg-tquot-surface px-10 py-4 text-center text-base font-semibold text-tquot-text shadow-sm transition-colors hover:border-tquot-accent/30 hover:text-tquot-accent"
            >
              {t.inventory}
            </Link>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-base font-semibold text-tquot-text">
            {t.recentRequests}
          </h2>
          <div className="rounded-xl border border-tquot-border bg-tquot-surface px-6 py-14 text-center shadow-sm">
            <p className="text-sm text-tquot-muted">{t.noRequests}</p>
          </div>
        </section>
      </main>
    </div>
  );
}

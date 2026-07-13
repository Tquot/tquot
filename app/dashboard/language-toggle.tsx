"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logoutAction } from "./actions";
import {
  DEFAULT_AGENCY_PROFILE,
  readAgencyProfile,
} from "./agency/agency-profile";
import { useDashboardLanguage } from "./dashboard-language-provider";
import { LocaleToggleButtons } from "./locale-toggle-buttons";
import { type Locale, translations } from "./translations";
import { STATUS_LABELS, type QuoteStatus } from "@/lib/quote-status/transitions";

export type RecentQuoteRow = {
  id: string;
  reference: string;
  origin: string;
  destination: string;
  departure_date: string;
  total_public_price: number;
  currency: string;
  created_at: string;
  status?: string | null;
};

type LanguageToggleProps = {
  email: string;
  recentQuotes: RecentQuoteRow[];
};

function getGreeting(locale: Locale) {
  const hour = new Date().getHours();
  const t = translations[locale];

  if (hour < 12) return t.greetingMorning;
  if (hour < 20) return t.greetingAfternoon;
  return t.greetingEvening;
}

function getDisplayName(email: string): string {
  const profile = readAgencyProfile();
  const agencyName = profile.agencyName.trim();
  if (agencyName && agencyName !== DEFAULT_AGENCY_PROFILE.agencyName) {
    return agencyName;
  }
  return email.split("@")[0];
}

function formatQuotePrice(value: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatQuoteDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

const navLinkClass =
  "hidden rounded-lg px-3 py-2 text-sm font-medium text-tquot-muted transition-colors hover:bg-tquot-bg hover:text-tquot-accent md:inline-flex";

const quickLinkClass =
  "rounded-xl border border-tquot-border bg-tquot-surface p-5 shadow-sm transition-colors hover:border-tquot-accent/30 hover:text-tquot-accent";

export function LanguageToggle({ email, recentQuotes }: LanguageToggleProps) {
  const { locale, t } = useDashboardLanguage();
  const [displayName, setDisplayName] = useState(() => email.split("@")[0]);

  useEffect(() => {
    setDisplayName(getDisplayName(email));
  }, [email]);

  const quickLinks = [
    {
      href: "/dashboard/new-quote",
      label: t.newQuote,
      className:
        "rounded-xl bg-tquot-teal p-5 text-base font-semibold text-white shadow-md transition-colors hover:bg-[#00b396] sm:col-span-2 lg:col-span-1",
    },
    { href: "/dashboard/inventory", label: t.inventory, className: quickLinkClass },
    { href: "/dashboard/clients", label: t.clients, className: quickLinkClass },
    {
      href: "/dashboard/integrations",
      label: t.integrations,
      className: quickLinkClass,
    },
    { href: "/dashboard/margins", label: t.margins, className: quickLinkClass },
    { href: "/dashboard/agency", label: t.agency, className: quickLinkClass },
  ];

  return (
    <div className="min-h-screen text-tquot-text">
      <header className="sticky top-0 z-10 border-b border-tquot-border bg-tquot-surface/95 backdrop-blur-sm">
        <div
          className="h-0.5 bg-gradient-to-r from-tquot-teal to-tquot-accent"
          aria-hidden
        />
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
            <Link href="/dashboard/clients" className={navLinkClass}>
              {t.clients}
            </Link>
            <Link href="/dashboard/integrations" className={navLinkClass}>
              {t.integrations}
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
            <span className="text-tquot-accent">{displayName}</span>
          </h1>
          <p className="mt-2 text-tquot-muted">{t.subtitle}</p>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-base font-semibold text-tquot-text">
            {t.quickAccess}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className={link.className}>
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-base font-semibold text-tquot-text">
            {t.recentQuotes}
          </h2>
          {recentQuotes.length === 0 ? (
            <div className="rounded-xl border border-tquot-border bg-tquot-surface px-6 py-14 text-center shadow-sm">
              <p className="text-sm text-tquot-muted">{t.noRecentQuotes}</p>
              <Link
                href="/dashboard/new-quote"
                className="mt-4 inline-flex rounded-xl bg-tquot-teal px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#00b396]"
              >
                {t.createFirstQuote}
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentQuotes.map((quote) => (
                <li
                  key={quote.id}
                  className="flex flex-col gap-3 rounded-xl border border-tquot-border bg-tquot-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-tquot-text">
                      {quote.origin} → {quote.destination}
                    </p>
                    <p className="mt-1 text-sm text-tquot-muted">
                      {quote.reference} ·{" "}
                      {formatQuoteDate(quote.departure_date, locale)}
                      {quote.status
                        ? ` · ${STATUS_LABELS[quote.status as QuoteStatus] ?? quote.status}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-4">
                    <p className="text-lg font-semibold tabular-nums text-tquot-teal">
                      {formatQuotePrice(
                        quote.total_public_price,
                        quote.currency,
                        locale,
                      )}
                    </p>
                    <a
                      href={`/api/quotes/${quote.id}/pdf?variant=client`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-tquot-border px-4 py-2 text-sm font-medium text-tquot-text transition-colors hover:border-tquot-accent hover:text-tquot-accent"
                    >
                      {t.viewPdf}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

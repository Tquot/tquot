"use client";

import Link from "next/link";
import { getGreeting, useLanguage } from "./language-provider";

const STAT_VALUES = ["0", "0", "1", "0"] as const;

export function DashboardHome({ email }: { email: string }) {
  const { t } = useLanguage();
  const greeting = getGreeting(t);

  const stats = [
    { label: t.statsToday, value: STAT_VALUES[0] },
    { label: t.statsMonth, value: STAT_VALUES[1] },
    { label: t.statsAgencies, value: STAT_VALUES[2] },
    { label: t.statsPdfs, value: STAT_VALUES[3] },
  ];

  return (
    <>
      <section className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {greeting},{" "}
          <span className="text-[#00C9A7]">{email}</span>
        </h1>
        <p className="mt-2 text-[#8B9CB3]">{t.subtitle}</p>
      </section>

      <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm"
          >
            <p className="text-sm font-medium text-[#8B9CB3]">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
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
    </>
  );
}

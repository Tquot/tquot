"use client";

import Link from "next/link";
import { PublicLocaleToggle } from "@/app/components/public-locale-toggle";
import { TQuotLogo } from "@/app/components/tquot-logo";
import { useSiteLanguage } from "@/app/language-provider";

export function HomePageClient() {
  const { t } = useSiteLanguage();

  const stats = [
    { value: "<60", unit: "sec", label: t.landingStatPerQuote },
    { value: "10×", unit: "", label: t.landingStatProductivity },
    { value: "75k+", unit: "", label: t.landingStatAgencies },
  ] as const;

  const features = [
    {
      title: t.landingFeatureFreeTextTitle,
      description: t.landingFeatureFreeTextDesc,
      icon: MessageIcon,
      accent: "teal" as const,
    },
    {
      title: t.landingFeatureAiSearchTitle,
      description: t.landingFeatureAiSearchDesc,
      icon: SearchIcon,
      accent: "warm" as const,
    },
    {
      title: t.landingFeatureMarginTitle,
      description: t.landingFeatureMarginDesc,
      icon: ChartIcon,
      accent: "accent" as const,
    },
    {
      title: t.landingFeaturePdfTitle,
      description: t.landingFeaturePdfDesc,
      icon: DocumentIcon,
      accent: "teal" as const,
    },
  ] as const;

  const accentStyles = {
    teal: {
      icon: "bg-tquot-teal/10 text-tquot-teal ring-tquot-teal/20",
      dot: "bg-tquot-teal",
    },
    warm: {
      icon: "bg-tquot-warm/10 text-tquot-warm ring-tquot-warm/20",
      dot: "bg-tquot-warm",
    },
    accent: {
      icon: "bg-tquot-accent/10 text-tquot-accent ring-tquot-accent/20",
      dot: "bg-tquot-accent",
    },
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-white via-tquot-bg to-tquot-bg text-tquot-text">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6 lg:px-8">
        <TQuotLogo variant="light" href="/" />
        <nav className="hidden items-center gap-6 text-sm font-medium text-tquot-muted sm:flex">
          <a href="#features" className="transition-colors hover:text-tquot-teal">
            {t.landingNavFeatures}
          </a>
          <Link href="/login" className="transition-colors hover:text-tquot-teal">
            {t.landingNavSignIn}
          </Link>
          <Link href="/dashboard" className="transition-colors hover:text-tquot-teal">
            {t.landingNavDashboard}
          </Link>
          <a
            href="#cta"
            className="rounded-full border border-tquot-teal/30 bg-tquot-teal/5 px-5 py-2 text-tquot-teal transition-all hover:border-tquot-teal/50 hover:bg-tquot-teal/10"
          >
            {t.landingNavEarlyAccess}
          </a>
        </nav>
        <PublicLocaleToggle className="shrink-0 sm:ml-2" />
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 text-center lg:px-8 lg:pb-28 lg:pt-16">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-tquot-border bg-tquot-surface px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-tquot-teal shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-tquot-teal" />
            {t.landingBadge}
          </div>

          <h1 className="mx-auto max-w-4xl font-[family-name:var(--font-outfit)] text-4xl font-bold leading-[1.08] tracking-tight text-tquot-text sm:text-5xl md:text-6xl lg:text-7xl">
            {t.landingHeroTitlePrefix}{" "}
            <span className="bg-gradient-to-r from-tquot-text via-tquot-accent to-tquot-teal bg-clip-text text-transparent">
              {t.landingHeroTitleSuffix}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-tquot-muted sm:text-xl">
            {t.landingHeroSubtitle}{" "}
            <span className="font-semibold text-tquot-teal">{t.landingHeroSeconds}</span>
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="group inline-flex items-center justify-center rounded-full bg-tquot-teal px-8 py-4 text-base font-semibold text-white shadow-sm transition-all hover:bg-[#00b396] hover:shadow-md"
            >
              {t.landingCtaGetStarted}
              <ArrowIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-full border border-tquot-border bg-tquot-surface px-8 py-4 text-base font-medium text-tquot-text shadow-sm transition-all hover:border-tquot-accent/30 hover:bg-tquot-bg"
            >
              {t.landingCtaHowItWorks}
            </a>
          </div>

          <div className="mx-auto mt-20 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center rounded-2xl border border-tquot-border bg-tquot-surface px-6 py-8 shadow-sm"
              >
                <div className="flex items-baseline gap-1 font-[family-name:var(--font-outfit)]">
                  <span className="text-4xl font-bold tracking-tight text-tquot-text sm:text-5xl">
                    {stat.value}
                  </span>
                  {stat.unit && (
                    <span className="text-lg font-semibold text-tquot-teal">
                      {stat.unit}
                    </span>
                  )}
                </div>
                <span className="mt-2 text-sm font-medium uppercase tracking-wider text-tquot-muted">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-tquot-border bg-tquot-surface p-6 shadow-md sm:p-8">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-tquot-warm" />
              <div className="h-3 w-3 rounded-full bg-tquot-accent" />
              <div className="h-3 w-3 rounded-full bg-tquot-teal" />
              <span className="ml-3 text-xs font-medium text-tquot-muted">
                {t.landingPreviewLabel}
              </span>
            </div>
            <div className="space-y-3 font-mono text-sm text-tquot-muted">
              <p>
                <span className="text-tquot-teal">→</span> {t.landingPreviewInput}
              </p>
              <p className="text-tquot-text">
                <span className="text-tquot-accent">✓</span> {t.landingPreviewItems}{" "}
                <span className="text-tquot-warm">{t.landingPreviewMargin}</span>
              </p>
              <p>
                <span className="text-tquot-teal">→</span> {t.landingPreviewGenerating}{" "}
                <span className="inline-block text-tquot-teal">████████</span> 47s
              </p>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="mx-auto max-w-6xl px-6 py-24 lg:px-8 lg:py-32"
        >
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-tquot-teal">
              {t.landingPlatformEyebrow}
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-tquot-text sm:text-4xl">
              {t.landingFeaturesTitle}
            </h2>
            <p className="mt-4 text-tquot-muted">{t.landingFeaturesSubtitle}</p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {features.map((feature) => {
              const style = accentStyles[feature.accent];
              return (
                <article
                  key={feature.title}
                  className="group rounded-2xl border border-tquot-border bg-tquot-surface p-8 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div
                    className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ring-1 ${style.icon}`}
                  >
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-[family-name:var(--font-outfit)] text-xl font-semibold text-tquot-text">
                    {feature.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-tquot-muted">
                    {feature.description}
                  </p>
                  <div
                    className={`mt-6 h-0.5 w-12 rounded-full ${style.dot} opacity-60 transition-all group-hover:w-20 group-hover:opacity-100`}
                  />
                </article>
              );
            })}
          </div>
        </section>

        <section id="cta" className="mx-auto max-w-6xl px-6 pb-24 lg:px-8 lg:pb-32">
          <div className="overflow-hidden rounded-3xl border border-tquot-teal/20 bg-gradient-to-br from-[#0a1525] to-[#0d2038] px-8 py-16 text-center sm:px-16 sm:py-20">
            <h2 className="font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t.landingCtaTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-white/70">{t.landingCtaSubtitle}</p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-tquot-teal px-10 py-4 text-base font-bold text-white shadow-sm transition-all hover:bg-[#00b396] hover:shadow-md"
            >
              {t.landingCtaButton}
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-tquot-teal/20 bg-gradient-to-br from-[#0a1525] to-[#0d2038]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row lg:px-8">
          <TQuotLogo variant="dark" href="/" />
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} TQuot. {t.landingFooterRights}
          </p>
          <Link
            href="https://tquot.io"
            className="text-sm font-medium text-tquot-teal transition-colors hover:text-[#00e5bb]"
          >
            tquot.io
          </Link>
        </div>
      </footer>
    </div>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M6 20l2.5-4.5M18 20l-2.5-4.5M4 8V6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-3 4z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M20 20l-3-3M11 8v6M8 11h6" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5M10 19V9M16 19v-6M22 19V3" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M9 13h6M9 17h4" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

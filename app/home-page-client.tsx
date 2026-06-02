"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import { LandingActivities } from "@/app/landing/landing-activities";
import { LandingAgentFlow } from "@/app/landing/landing-agent-flow";
import { LandingComparator } from "@/app/landing/landing-comparator";
import { LandingHotels } from "@/app/landing/landing-hotels";
import { LandingPdf } from "@/app/landing/landing-pdf";
import { LandingRoi } from "@/app/landing/landing-roi";
import { SectionIntro } from "@/app/landing/section-intro";
import { PublicLocaleToggle } from "@/app/components/public-locale-toggle";
import { TQuotLogo } from "@/app/components/tquot-logo";
import type { DashboardTranslation } from "@/app/dashboard/translations";
import { useSiteLanguage } from "@/app/language-provider";

const CONTACT_EMAIL = "hello@tquot.io";

const NAV_LINKS = [
  { href: "#flow", key: "landingNavFlow" as const },
  { href: "#hoteles", key: "landingNavHotels" as const },
  { href: "#comparador", key: "landingNavComparator" as const },
  { href: "#connectors", key: "landingNavConnectors" as const },
  { href: "#pricing", key: "landingNavPricing" as const },
] as const;

const FOOTER_NAV_LINKS = [
  ...NAV_LINKS,
  { href: "#how-it-works", key: "landingNavHowItWorks" as const },
  { href: "#faq", key: "landingNavFaq" as const },
] as const;

type ConnectorBadgeVariant = "teal" | "blue" | "purple" | "grey";

const CONNECTORS: Array<{
  id: string;
  nameKey:
    | "landingConnectorHotelbeds"
    | "landingConnectorBooking"
    | "landingConnectorDuffel"
    | "landingConnectorRateHawk"
    | "landingConnectorViator"
    | "landingConnectorCivitatis"
    | "landingConnectorBattleface"
    | "landingConnectorSmytravel";
  badge: ConnectorBadgeVariant;
  connected: boolean;
  initials?: string;
}> = [
  { id: "hotelbeds", nameKey: "landingConnectorHotelbeds", badge: "teal", connected: true },
  { id: "booking", nameKey: "landingConnectorBooking", badge: "blue", connected: true },
  { id: "duffel", nameKey: "landingConnectorDuffel", badge: "purple", connected: true },
  {
    id: "ratehawk",
    nameKey: "landingConnectorRateHawk",
    badge: "grey",
    connected: false,
    initials: "RH",
  },
  {
    id: "viator",
    nameKey: "landingConnectorViator",
    badge: "grey",
    connected: false,
    initials: "VI",
  },
  {
    id: "civitatis",
    nameKey: "landingConnectorCivitatis",
    badge: "grey",
    connected: false,
    initials: "CI",
  },
  {
    id: "battleface",
    nameKey: "landingConnectorBattleface",
    badge: "grey",
    connected: false,
    initials: "BF",
  },
  {
    id: "smytravel-hotels",
    nameKey: "landingConnectorSmytravel",
    badge: "grey",
    connected: false,
    initials: "SM",
  },
];

const CONNECTOR_BADGE_STYLES: Record<ConnectorBadgeVariant, string> = {
  teal: "border-tquot-teal/35 bg-tquot-teal/10 text-tquot-teal",
  blue: "border-blue-200 bg-blue-50 text-[#1e40af]",
  purple: "border-purple-200 bg-purple-50 text-purple-800",
  grey: "border-slate-200 bg-slate-100 text-slate-600",
};

export function HomePageClient() {
  const { t } = useSiteLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const features = [
    { title: t.landingFeature1Title, desc: t.landingFeature1Desc, icon: SparkIcon, accent: "teal" },
    { title: t.landingFeature2Title, desc: t.landingFeature2Desc, icon: InventoryIcon, accent: "accent" },
    { title: t.landingFeature3Title, desc: t.landingFeature3Desc, icon: PlugIcon, accent: "warm" },
    { title: t.landingFeature4Title, desc: t.landingFeature4Desc, icon: CompareIcon, accent: "teal" },
    { title: t.landingFeature5Title, desc: t.landingFeature5Desc, icon: DocumentIcon, accent: "accent" },
    { title: t.landingFeature6Title, desc: t.landingFeature6Desc, icon: ChatIcon, accent: "warm" },
  ] as const;

  const faqItems = [
    { q: t.landingFaq1Q, a: t.landingFaq1A },
    { q: t.landingFaq2Q, a: t.landingFaq2A },
    { q: t.landingFaq3Q, a: t.landingFaq3A },
    { q: t.landingFaq4Q, a: t.landingFaq4A },
  ];

  const pricingPlans = [
    {
      name: t.landingPlanSoloName,
      price: t.landingPlanSoloPrice,
      period: t.landingPlanSoloPeriod,
      desc: t.landingPlanSoloDesc,
      features: [
        t.landingPlanSoloFeature1,
        t.landingPlanSoloFeature2,
        t.landingPlanSoloFeature3,
        t.landingPlanSoloFeature4,
      ],
      featured: false,
    },
    {
      name: t.landingPlanAgencyName,
      price: t.landingPlanAgencyPrice,
      period: t.landingPlanAgencyPeriod,
      desc: t.landingPlanAgencyDesc,
      features: [
        t.landingPlanAgencyFeature1,
        t.landingPlanAgencyFeature2,
        t.landingPlanAgencyFeature3,
        t.landingPlanAgencyFeature4,
      ],
      featured: true,
    },
    {
      name: t.landingPlanProName,
      price: t.landingPlanProPrice,
      period: t.landingPlanProPeriod,
      desc: t.landingPlanProDesc,
      features: [
        t.landingPlanProFeature1,
        t.landingPlanProFeature2,
        t.landingPlanProFeature3,
        t.landingPlanProFeature4,
      ],
      featured: false,
      contactEmail: true,
    },
  ];

  return (
    <div className="relative overflow-x-hidden bg-gradient-to-b from-white via-tquot-bg to-tquot-bg text-tquot-text">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,184,148,0.12),transparent)]"
        aria-hidden
      />

      <LandingHeader t={t} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 text-center lg:px-8 lg:pb-24 lg:pt-14">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-tquot-border bg-tquot-surface px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-tquot-teal shadow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tquot-teal" />
            {t.landingBadge}
          </div>

          <h1 className="mx-auto max-w-4xl font-[family-name:var(--font-outfit)] text-4xl font-bold leading-[1.08] tracking-tight text-tquot-navy sm:text-5xl md:text-6xl lg:text-[3.25rem]">
            {t.landingHeroTitle}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-tquot-muted sm:text-xl">
            {t.landingHeroSubtitle}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="group inline-flex items-center justify-center rounded-full bg-tquot-teal px-8 py-4 text-base font-semibold text-white shadow-sm transition-all hover:bg-[#00a884] hover:shadow-md"
            >
              {t.landingCtaGetStarted}
              <ArrowIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#flow"
              className="inline-flex items-center justify-center rounded-full border border-tquot-border bg-tquot-surface px-8 py-4 text-base font-medium text-tquot-text shadow-sm transition-all hover:border-tquot-accent/30 hover:bg-white"
            >
              {t.landingCtaHowItWorks}
            </a>
          </div>

          <p className="mx-auto mt-10 max-w-xl text-sm text-tquot-muted">
            ⏱ {t.landingHeroTimer}{" "}
            <strong className="text-tquot-navy">{t.landingHeroTimerValue}</strong>{" "}
            {t.landingHeroTimerSuffix}
          </p>

          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard animatedTime t={t} />
            <StatCard
              value={t.landingStatQuotesValue}
              label={t.landingStatQuotesLabel}
              accent="accent"
            />
            <StatCard
              value={t.landingStatSavingsValue}
              label={t.landingStatSavingsLabel}
              accent="warm"
            />
          </div>
        </section>

        <LandingAgentFlow t={t} />
        <LandingHotels t={t} />
        <LandingActivities t={t} />
        <LandingComparator t={t} />

        <section
          id="how-it-works"
          className="border-y border-tquot-border bg-tquot-surface/60 py-20 lg:py-28"
        >
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <SectionIntro
              eyebrow={t.landingHowEyebrow}
              title={t.landingHowTitle}
              centered
            />
            <ol className="mt-14 grid gap-8 md:grid-cols-3">
              <HowStep
                step={1}
                title={t.landingStep1Title}
                description={t.landingStep1Desc}
                icon={PasteIcon}
              />
              <HowStep
                step={2}
                title={t.landingStep2Title}
                description={t.landingStep2Desc}
                icon={SearchProvidersIcon}
              />
              <HowStep
                step={3}
                title={t.landingStep3Title}
                description={t.landingStep3Desc}
                icon={SendIcon}
              />
            </ol>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 lg:px-8 lg:py-28">
          <SectionIntro
            eyebrow={t.landingFeaturesEyebrow}
            title={t.landingFeaturesTitle}
            subtitle={t.landingFeaturesSubtitle}
            centered
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        <section
          id="connectors"
          className="border-t border-tquot-border bg-gradient-to-b from-tquot-bg to-white py-20 lg:py-28"
        >
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <SectionIntro
              eyebrow={t.landingConnectorsEyebrow}
              title={t.landingConnectorsTitle}
              subtitle={t.landingConnectorsSubtitle}
              centered
            />
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
              {CONNECTORS.map((connector) => (
                <ConnectorCard key={connector.id} connector={connector} t={t} />
              ))}
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-tquot-teal/40 bg-tquot-teal/5 px-4 py-6">
                <span className="font-[family-name:var(--font-outfit)] text-2xl font-bold text-tquot-teal">
                  +
                </span>
                <span className="text-sm font-semibold text-tquot-teal">
                  {t.landingConnectorsMore}
                </span>
              </div>
            </div>
            <p className="mt-8 text-center text-sm text-tquot-muted">
              {t.landingConnectorsDisclaimer}
            </p>
          </div>
        </section>

        <LandingPdf t={t} />
        <LandingRoi t={t} />

        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 lg:px-8 lg:py-28">
          <SectionIntro
            eyebrow={t.landingPricingEyebrow}
            title={t.landingPricingTitle}
            subtitle={t.landingPricingSubtitle}
            centered
          />
          <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:items-stretch">
            {pricingPlans.map((plan) => (
              <PricingCard key={plan.name} plan={plan} t={t} />
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-tquot-muted">{t.landingPricingNote}</p>
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-6 pb-20 lg:px-8 lg:pb-28">
          <h2 className="text-center font-[family-name:var(--font-outfit)] text-3xl font-bold text-tquot-navy sm:text-4xl">
            {t.landingFaqTitle}
          </h2>
          <div className="mt-10 space-y-3">
            {faqItems.map((item, index) => (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-tquot-border bg-tquot-surface shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-tquot-text transition-colors hover:bg-tquot-bg/50"
                  aria-expanded={faqOpen === index}
                >
                  {item.q}
                  <ChevronIcon expanded={faqOpen === index} />
                </button>
                {faqOpen === index ? (
                  <p className="border-t border-tquot-border px-5 pb-4 text-sm leading-relaxed text-tquot-muted">
                    {item.a}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section id="cta" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-20 lg:px-8 lg:pb-28">
          <div className="overflow-hidden rounded-3xl border border-tquot-teal/20 bg-gradient-to-br from-tquot-navy-deep to-[#0d2038] px-8 py-16 text-center sm:px-16 sm:py-20">
            <h2 className="font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t.landingFinalCtaTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-white/70">{t.landingFinalCtaSubtitle}</p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-tquot-teal px-10 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-[#00a884] hover:shadow-xl"
            >
              {t.landingFinalCtaButton}
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter t={t} />
    </div>
  );
}

function ConnectorCard({
  connector,
  t,
}: {
  connector: (typeof CONNECTORS)[number];
  t: DashboardTranslation;
}) {
  const showInitials = connector.badge === "grey" && connector.initials;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-tquot-border bg-tquot-surface p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        {showInitials ? (
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${CONNECTOR_BADGE_STYLES.grey}`}
          >
            {connector.initials}
          </span>
        ) : (
          <span
            className={`inline-flex max-w-full rounded-lg border px-2.5 py-1.5 text-xs font-bold leading-tight ${CONNECTOR_BADGE_STYLES[connector.badge]}`}
          >
            {t[connector.nameKey]}
          </span>
        )}
        <span
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
            connector.connected ? "bg-tquot-success" : "bg-slate-300"
          }`}
          title={
            connector.connected
              ? t.landingConnectorStatusConnected
              : t.landingConnectorStatusAvailable
          }
        />
      </div>
      {showInitials ? (
        <p className="text-sm font-semibold text-tquot-text">{t[connector.nameKey]}</p>
      ) : null}
      <p className="text-[11px] font-medium text-tquot-muted">
        {connector.connected
          ? t.landingConnectorStatusConnected
          : t.landingConnectorStatusAvailable}
      </p>
    </article>
  );
}

function LandingHeader({
  t,
  menuOpen,
  setMenuOpen,
}: {
  t: DashboardTranslation;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}) {
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-tquot-border/80 bg-tquot-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
          <TQuotLogo variant="light" href="/" />
          <nav className="hidden items-center gap-5 text-sm font-medium text-tquot-muted lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-tquot-teal"
              >
                {t[link.key]}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <PublicLocaleToggle className="hidden sm:flex" />
            <Link
              href="/login"
              className="hidden rounded-full bg-tquot-teal px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#00a884] sm:inline-flex"
            >
              {t.landingNavRequestAccess}
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-tquot-border text-tquot-text lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? t.landingMenuClose : t.landingMenuOpen}
            >
              {menuOpen ? <CloseMenuIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-tquot-navy/40 backdrop-blur-sm"
            aria-label={t.landingMenuClose}
            onClick={closeMenu}
          />
          <nav className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col gap-1 border-l border-tquot-border bg-tquot-surface p-6 pt-20 shadow-xl">
            <PublicLocaleToggle className="mb-4" />
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-lg px-3 py-3 text-base font-medium text-tquot-text transition-colors hover:bg-tquot-bg"
              >
                {t[link.key]}
              </a>
            ))}
            <Link
              href="/login"
              onClick={closeMenu}
              className="mt-4 rounded-full bg-tquot-teal px-5 py-3 text-center text-sm font-semibold text-white"
            >
              {t.landingNavRequestAccess}
            </Link>
            <Link
              href="/login"
              onClick={closeMenu}
              className="mt-2 rounded-lg px-3 py-3 text-center text-sm font-medium text-tquot-muted"
            >
              {t.landingNavSignIn}
            </Link>
          </nav>
        </div>
      ) : null}
    </>
  );
}

function LandingFooter({ t }: { t: DashboardTranslation }) {
  return (
    <footer className="relative z-10 border-t border-tquot-teal/20 bg-gradient-to-br from-tquot-navy-deep to-[#0d2038]">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <TQuotLogo variant="dark" href="/" />
            <p className="mt-4 max-w-sm text-sm text-white/60">
              {t.landingHeroSubtitle}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
              {t.landingFooterProduct}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {FOOTER_NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-white/70 hover:text-tquot-teal">
                    {t[link.key]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
              {t.landingFooterCompany}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-white/70 hover:text-tquot-teal"
                >
                  {t.landingFooterEmail}
                </a>
              </li>
              <li>
                <Link href="/login" className="text-white/70 hover:text-tquot-teal">
                  {t.landingNavSignIn}
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-white/70 hover:text-tquot-teal">
                  {t.landingNavDashboard}
                </Link>
              </li>
              <li>
                <a href="#cta" className="text-white/70 hover:text-tquot-teal">
                  {t.landingNavRequestAccess}
                </a>
              </li>
              <li>
                <span className="text-white/40">{t.landingFooterPrivacy}</span>
              </li>
              <li>
                <span className="text-white/40">{t.landingFooterTerms}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} TQuot. {t.landingFooterRights}
          </p>
          <div className="flex flex-col items-center gap-1 sm:items-end">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm font-medium text-tquot-teal hover:text-[#00e5bb]"
            >
              {CONTACT_EMAIL}
            </a>
            <Link
              href="https://tquot.io"
              className="text-sm text-white/50 hover:text-white/70"
            >
              tquot.io
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function StatCard({
  value,
  label,
  accent = "teal",
  animatedTime,
  t,
}: {
  value?: string;
  label?: string;
  accent?: "teal" | "accent" | "warm";
  animatedTime?: boolean;
  t?: DashboardTranslation;
}) {
  const accentClass = {
    teal: "text-tquot-teal",
    accent: "text-tquot-accent",
    warm: "text-tquot-warm",
  }[accent];

  if (animatedTime && t) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-tquot-border bg-tquot-surface px-6 py-8 shadow-sm">
        <div className="flex items-baseline gap-2 font-[family-name:var(--font-outfit)]">
          <span className="text-2xl font-semibold text-tquot-muted line-through decoration-tquot-warm/80 sm:text-3xl">
            {t.landingStatTimeBefore}
          </span>
          <ArrowIcon className="h-5 w-5 text-tquot-teal" />
          <span className={`text-4xl font-bold sm:text-5xl ${accentClass}`}>
            {t.landingStatTimeAfter}
          </span>
        </div>
        <span className="mt-2 text-center text-sm font-medium uppercase tracking-wider text-tquot-muted">
          {t.landingStatTimeLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-2xl border border-tquot-border bg-tquot-surface px-6 py-8 shadow-sm">
      <span
        className={`font-[family-name:var(--font-outfit)] text-4xl font-bold tracking-tight sm:text-5xl ${accentClass}`}
      >
        {value}
      </span>
      <span className="mt-2 text-center text-sm font-medium uppercase tracking-wider text-tquot-muted">
        {label}
      </span>
    </div>
  );
}

function HowStep({
  step,
  title,
  description,
  icon: Icon,
}: {
  step: number;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <li className="relative flex flex-col rounded-2xl border border-tquot-border bg-tquot-surface p-8 shadow-sm">
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-tquot-teal font-[family-name:var(--font-outfit)] text-sm font-bold text-white">
        {step}
      </span>
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-tquot-teal/10 text-tquot-teal ring-1 ring-tquot-teal/20">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-[family-name:var(--font-outfit)] text-xl font-semibold text-tquot-navy">
        {title}
      </h3>
      <p className="mt-3 leading-relaxed text-tquot-muted">{description}</p>
    </li>
  );
}

function FeatureCard({
  title,
  desc,
  icon: Icon,
  accent,
}: {
  title: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
}) {
  const styles = {
    teal: "bg-tquot-teal/10 text-tquot-teal ring-tquot-teal/20",
    accent: "bg-tquot-accent/10 text-tquot-accent ring-tquot-accent/20",
    warm: "bg-tquot-warm/10 text-tquot-warm ring-tquot-warm/20",
  }[accent as "teal" | "accent" | "warm"];

  return (
    <article className="group rounded-2xl border border-tquot-border bg-tquot-surface p-8 shadow-sm transition-shadow hover:shadow-md">
      <div
        className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ring-1 ${styles}`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-[family-name:var(--font-outfit)] text-lg font-semibold text-tquot-navy">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-tquot-muted">{desc}</p>
    </article>
  );
}

function PricingCard({
  plan,
  t,
}: {
  plan: {
    name: string;
    price: string;
    period: string;
    desc: string;
    features: string[];
    featured: boolean;
    contactEmail?: boolean;
  };
  t: DashboardTranslation;
}) {
  return (
    <article
      className={`relative flex flex-col rounded-2xl border p-8 shadow-sm ${
        plan.featured
          ? "scale-[1.02] border-2 border-tquot-teal bg-gradient-to-b from-tquot-teal/5 to-white shadow-md ring-1 ring-tquot-teal/20"
          : "border-tquot-border bg-tquot-surface"
      }`}
    >
      {plan.featured ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-tquot-teal px-4 py-1 text-xs font-bold uppercase tracking-wide text-white">
          {t.landingPricingFeaturedBadge}
        </span>
      ) : null}
      <h3 className="font-[family-name:var(--font-outfit)] text-xl font-bold text-tquot-navy">
        {plan.name}
      </h3>
      <p className="mt-1 text-sm text-tquot-muted">{plan.desc}</p>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="font-[family-name:var(--font-outfit)] text-4xl font-bold text-tquot-navy">
          {plan.price}
        </span>
        <span className="text-tquot-muted">{plan.period}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-3 text-sm text-tquot-muted">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-tquot-teal" />
            {feature}
          </li>
        ))}
      </ul>
      {plan.contactEmail ? (
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-8 block rounded-full border border-tquot-border bg-white py-3 text-center text-sm font-bold text-tquot-text transition-colors hover:border-tquot-teal hover:text-tquot-teal"
        >
          {t.landingPlanProCtaContact}
        </a>
      ) : (
        <Link
          href="/login"
          className={`mt-8 block rounded-full py-3 text-center text-sm font-bold transition-colors ${
            plan.featured
              ? "bg-tquot-teal text-white hover:bg-[#00a884]"
              : "border border-tquot-border bg-white text-tquot-text hover:border-tquot-teal hover:text-tquot-teal"
          }`}
        >
          {t.landingPricingCta}
        </Link>
      )}
    </article>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 text-tquot-muted transition-transform ${expanded ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseMenuIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5L20 7" />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
    </svg>
  );
}

function InventoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h10M4 17h16" />
    </svg>
  );
}

function PlugIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6M8 5h8M7 13h10v6H7z" />
    </svg>
  );
}

function CompareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12M8 12h8M8 17h4M4 7v.01M4 12v.01M4 17v.01" />
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

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M6 20l2.5-4.5M18 20l-2.5-4.5M4 8V6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-3 4z" />
    </svg>
  );
}

function PasteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function SearchProvidersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M20 20l-3-3" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

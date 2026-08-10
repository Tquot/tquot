"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/app/language-provider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";

interface Plan {
  key: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
  tag?: string;
}

export function Pricing() {
  const { t } = useSiteLanguage();

  const PLANS: Plan[] = [
    {
      key: "solo",
      name: t.landingPlanSoloName,
      description: t.landingPlanSoloDesc,
      price: 99,
      features: [
        t.landingPlanSoloFeature1,
        t.landingPlanSoloFeature2,
        t.landingPlanSoloFeature3,
        t.landingPlanSoloFeature4,
      ],
      cta: { label: t.landingPricingCta, href: "/login" },
    },
    {
      key: "agency",
      name: t.landingPlanAgencyName,
      description: t.landingPlanAgencyDesc,
      price: 179,
      features: [
        t.landingPlanAgencyFeature1,
        t.landingPlanAgencyFeature2,
        t.landingPlanAgencyFeature3,
        t.landingPlanAgencyFeature4,
      ],
      cta: { label: t.landingPricingCta, href: "/login" },
      highlight: true,
      tag: t.landingPricingFeaturedBadge,
    },
    {
      key: "pro",
      name: t.landingPlanProName,
      description: t.landingPlanProDesc,
      price: 349,
      features: [
        t.landingPlanProFeature1,
        t.landingPlanProFeature2,
        t.landingPlanProFeature3,
        t.landingPlanProFeature4,
      ],
      cta: { label: t.landingPlanProCtaContact, href: `mailto:${t.landingFooterEmail}` },
    },
  ];

  return (
    <section id="pricing" className="py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">{t.landingPricingEyebrow}</Eyebrow>
        <h2 className="mb-3 max-w-[560px] font-serif text-h1 text-ink" style={{ fontWeight: 500 }}>
          {t.landingPricingTitleUi}
        </h2>
        <p className="mb-10 text-body text-text-2">
          {t.landingPricingSubtitle}
        </p>
        <div className="grid max-w-[1000px] grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              period={t.landingPricingPeriodSpaced}
            />
          ))}
        </div>
        <p className="mt-8 max-w-[700px] text-body-sm text-text-2">
          {t.landingPricingNoteLead}{" "}
          <a
            href={`mailto:${t.landingFooterEmail}`}
            className="text-ink underline transition-colors hover:text-umber"
          >
            {t.landingPricingNoteLink}
          </a>
        </p>
      </div>
    </section>
  );
}

function PlanCard({ plan, period }: { plan: Plan; period: string }) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-lg bg-paper p-6",
        plan.highlight
          ? "border-2 border-ink shadow-card-hover"
          : "border border-border-1 shadow-card",
      )}
    >
      <header className="mb-5">
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="eyebrow">{plan.name}</h3>
          {plan.tag ? (
            <span className="rounded-full bg-umber/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-umber">
              {plan.tag}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-body-sm text-text-2">{plan.description}</p>
        <div className="mt-4 flex items-baseline gap-1.5">
          <span
            className="font-serif text-[48px] leading-none tracking-tight text-ink tabular-nums"
            style={{ fontWeight: 500 }}
          >
            {plan.price}
          </span>
          <span className="text-h3 text-ink">€</span>
          <span className="ml-1 text-body-sm text-text-2">{period}</span>
        </div>
      </header>
      <ul className="flex-1 space-y-2 text-body-sm">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-0.5 text-ink">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {plan.cta.href.startsWith("mailto:") ? (
        <a
          href={plan.cta.href}
          className={cn(
            "mt-6 inline-flex h-11 items-center justify-center rounded-md text-body font-medium transition-colors",
            plan.highlight
              ? "bg-ink text-paper hover:bg-ink-2"
              : "border border-border-2 text-ink hover:border-border-3 hover:bg-paper-2",
          )}
        >
          {plan.cta.label}
        </a>
      ) : (
        <Link
          href={plan.cta.href}
          className={cn(
            "mt-6 inline-flex h-11 items-center justify-center rounded-md text-body font-medium transition-colors",
            plan.highlight
              ? "bg-ink text-paper hover:bg-ink-2"
              : "border border-border-2 text-ink hover:border-border-3 hover:bg-paper-2",
          )}
        >
          {plan.cta.label}
        </Link>
      )}
    </article>
  );
}

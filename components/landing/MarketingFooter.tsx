"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/app/language-provider";

export function MarketingFooter() {
  const { t } = useSiteLanguage();

  return (
    <footer className="border-t border-border-1 bg-paper py-10">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-8 px-5 md:grid-cols-4">
        <div>
          <span className="font-mono text-mono-md font-semibold tracking-tight text-ink">
            TQUOT
          </span>
          <p className="mt-2 max-w-[220px] text-body-sm leading-relaxed text-text-2">
            {t.landingFooterTagline}
          </p>
        </div>
        <FooterCol
          title={t.landingFooterProduct}
          links={[
            { href: "#flujo", label: t.landingNavFlow },
            { href: "#hoteles", label: t.landingNavHotels },
            { href: "#comparador", label: t.landingNavComparator },
            { href: "#pricing", label: t.landingNavPricing },
          ]}
        />
        <FooterCol
          title={t.landingFooterCompany}
          links={[
            { href: `mailto:${t.landingFooterEmail}`, label: t.landingFooterEmail },
            { href: "/login", label: t.landingNavSignIn },
            { href: "/dashboard", label: t.landingNavDashboard },
          ]}
        />
        <FooterCol
          title={t.landingFooterLegal}
          links={[
            { href: "/privacy", label: t.landingFooterPrivacy },
            { href: "/terms", label: t.landingFooterTerms },
          ]}
        />
      </div>
      <div className="mx-auto mt-10 max-w-[1200px] border-t border-border-1 px-5 pt-6">
        <span className="text-body-sm text-text-3">
          {t.landingFooterMadeIn}
        </span>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <div className="mb-3 font-mono text-eyebrow uppercase text-text-3">
        {title}
      </div>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            {link.href.startsWith("mailto:") || link.href.startsWith("#") ? (
              <a
                href={link.href}
                className="text-body-sm text-text transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-body-sm text-text transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

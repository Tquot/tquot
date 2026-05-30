"use client";

import Link from "next/link";
import { PublicLocaleToggle } from "@/app/components/public-locale-toggle";
import { TQuotLogo } from "@/app/components/tquot-logo";
import { useSiteLanguage } from "@/app/language-provider";
import { LoginForm } from "./login-form";

type LoginPageClientProps = {
  redirectTo?: string;
};

export function LoginPageClient({ redirectTo }: LoginPageClientProps) {
  const { t } = useSiteLanguage();

  const bullets = [
    { title: t.loginBullet1Title, description: t.loginBullet1Desc },
    { title: t.loginBullet2Title, description: t.loginBullet2Desc },
    { title: t.loginBullet3Title, description: t.loginBullet3Desc },
  ];

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative flex flex-col justify-center overflow-hidden bg-gradient-to-br from-tquot-text via-[#0d2038] to-tquot-accent px-8 py-12 lg:px-12 lg:py-16">
        <div
          className="pointer-events-none absolute -right-24 top-1/4 h-64 w-64 rounded-full bg-tquot-teal/10 blur-3xl"
          aria-hidden
        />

        <div className="relative max-w-lg">
          <div className="mb-10 flex items-center justify-between gap-4">
            <TQuotLogo variant="dark" href="/" />
            <PublicLocaleToggle variant="dark" />
          </div>

          <h1 className="font-[family-name:var(--font-outfit)] text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.5rem]">
            {t.loginTagline}
          </h1>

          <ul className="mt-10 space-y-6">
            {bullets.map((item) => (
              <li key={item.title} className="flex gap-4">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tquot-teal/20 text-tquot-teal"
                  aria-hidden
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-white/70">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center bg-tquot-bg px-6 py-12">
        <div className="mb-6 flex w-full max-w-md justify-end lg:hidden">
          <PublicLocaleToggle />
        </div>

        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-tquot-border bg-tquot-surface p-8 shadow-md">
            <h2 className="text-center text-2xl font-semibold tracking-tight text-tquot-text">
              {t.loginTitle}
            </h2>
            <p className="mt-2 text-center text-sm text-tquot-muted">
              {t.loginSubtitle}
            </p>

            <div className="mt-8">
              <LoginForm redirectTo={redirectTo} />
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-tquot-muted">
            <Link
              href="/"
              className="font-medium text-tquot-teal transition-colors hover:text-[#00b396]"
            >
              {t.loginBackHome}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

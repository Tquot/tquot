"use client";

import Link from "next/link";
import { LanguageProvider } from "./language-provider";
import { LanguageToggle } from "./language-toggle";
import { LogoutButtonClient } from "./logout-button-client";

type DashboardShellProps = {
  email: string;
  children: React.ReactNode;
};

export function DashboardShell({ email, children }: DashboardShellProps) {
  return (
    <LanguageProvider>
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
              <LanguageToggle />
              <LogoutButtonClient />
            </div>
          </div>
        </header>

        <main className="relative mx-auto max-w-6xl px-6 py-10 sm:py-12">
          {children}
        </main>
      </div>
    </LanguageProvider>
  );
}

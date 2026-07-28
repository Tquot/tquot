"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "#flujo", label: "Flujo" },
  { href: "#hoteles", label: "Hoteles" },
  { href: "#comparador", label: "Comparador" },
  { href: "#connectors", label: "Proveedores" },
  { href: "#pricing", label: "Precios" },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-180",
        scrolled
          ? "border-b border-border-1 bg-paper/95 backdrop-blur-sm"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-14 max-w-[1200px] items-center px-5">
        <Link
          href="/"
          className="font-mono text-mono-md font-semibold tracking-tight text-ink"
        >
          TQUOT
        </Link>
        <nav className="ml-8 hidden items-center gap-6 text-body-sm md:flex">
          {SECTIONS.map((section) => (
            <a
              key={section.href}
              href={section.href}
              className="text-text transition-colors hover:text-ink"
            >
              {section.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-body-sm text-text transition-colors hover:text-ink sm:inline"
          >
            Entrar
          </Link>
          <Link
            href="#cta"
            className="inline-flex h-9 items-center rounded-md bg-ink px-4 text-body-sm font-medium text-paper transition-colors hover:bg-ink-2"
          >
            Solicitar acceso
          </Link>
        </div>
      </div>
    </header>
  );
}

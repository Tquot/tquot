import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { HeroStatsTrio } from "./HeroStatsTrio";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-[1200px] px-5 pt-12 pb-12 sm:pt-20">
        <div className="max-w-[760px]">
          <Eyebrow className="mb-5 block">Para agencias de viajes</Eyebrow>
          <h1
            className="font-serif text-[40px] leading-[1.02] tracking-[-0.025em] text-ink sm:text-[64px] md:text-[80px]"
            style={{ fontWeight: 500 }}
          >
            De email a cotización
            <br />
            en <span className="text-umber">60 segundos</span>.
          </h1>
          <p className="mt-6 max-w-[600px] text-[17px] leading-[1.5] text-text sm:mt-8 sm:text-[20px]">
            TQuot convierte peticiones en lenguaje natural en propuestas
            profesionales con vuelos, hoteles y experiencias. Con tus márgenes.
            Con tu marca.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="#cta"
              className="inline-flex h-12 items-center justify-center rounded-md bg-ink px-5 text-body font-medium text-paper transition-colors hover:bg-ink-2"
            >
              Solicitar acceso
            </Link>
            <a
              href="#demo"
              className="inline-flex h-12 items-center justify-center rounded-md px-5 text-body font-medium text-ink transition-colors hover:bg-paper-2"
            >
              Ver cómo funciona →
            </a>
          </div>
          <p className="mt-5 font-mono text-mono-sm text-text-3">
            En acceso anticipado · Validado con agentes reales
          </p>
        </div>
      </div>
      <HeroStatsTrio />
    </section>
  );
}

import Link from "next/link";
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

const PLANS: Plan[] = [
  {
    key: "solo",
    name: "SOLO",
    description: "Para agentes independientes.",
    price: 99,
    features: [
      "1 usuario",
      "Cotizaciones ilimitadas",
      "PDF con tu marca",
      "Connectors esenciales",
    ],
    cta: { label: "Solicitar acceso", href: "/login" },
  },
  {
    key: "agency",
    name: "AGENCIA",
    description: "Para equipos comerciales en crecimiento.",
    price: 179,
    features: [
      "Hasta 5 usuarios",
      "Inventario + comparador",
      "TQuot Agent completo",
      "Soporte prioritario",
    ],
    cta: { label: "Solicitar acceso", href: "/login" },
    highlight: true,
    tag: "Más popular",
  },
  {
    key: "pro",
    name: "PRO",
    description: "Para agencias con alto volumen.",
    price: 349,
    features: [
      "Usuarios ilimitados",
      "Todos los connectors",
      "API y exportaciones",
      "Onboarding dedicado",
    ],
    cta: { label: "Contactar", href: "mailto:hello@tquot.io" },
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">Precios</Eyebrow>
        <h2 className="mb-3 max-w-[560px] font-serif text-h1 text-ink" style={{ fontWeight: 500 }}>
          Planes para cada tamaño de agencia.
        </h2>
        <p className="mb-10 text-body text-text-2">
          Precios orientativos para acceso anticipado. IVA no incluido.
        </p>
        <div className="grid max-w-[1000px] grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard key={plan.key} plan={plan} />
          ))}
        </div>
        <p className="mt-8 max-w-[700px] text-body-sm text-text-2">
          ¿Varias sedes o volumen alto?{" "}
          <a
            href="mailto:hello@tquot.io"
            className="text-ink underline transition-colors hover:text-umber"
          >
            Contacta para un plan Enterprise.
          </a>
        </p>
      </div>
    </section>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
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
          <span className="ml-1 text-body-sm text-text-2">/ mes</span>
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

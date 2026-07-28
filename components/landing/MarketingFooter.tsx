import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border-1 bg-paper py-10">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-8 px-5 md:grid-cols-4">
        <div>
          <span className="font-mono text-mono-md font-semibold tracking-tight text-ink">
            TQUOT
          </span>
          <p className="mt-2 max-w-[220px] text-body-sm leading-relaxed text-text-2">
            Cotizaciones para agencias de viajes españolas.
          </p>
        </div>
        <FooterCol
          title="Producto"
          links={[
            { href: "#flujo", label: "Flujo" },
            { href: "#hoteles", label: "Hoteles" },
            { href: "#comparador", label: "Comparador" },
            { href: "#pricing", label: "Precios" },
          ]}
        />
        <FooterCol
          title="Empresa"
          links={[
            { href: "mailto:hello@tquot.io", label: "hello@tquot.io" },
            { href: "/login", label: "Iniciar sesión" },
            { href: "/dashboard", label: "Panel" },
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            { href: "/privacy", label: "Privacidad" },
            { href: "/terms", label: "Términos" },
          ]}
        />
      </div>
      <div className="mx-auto mt-10 max-w-[1200px] border-t border-border-1 px-5 pt-6">
        <span className="text-body-sm text-text-3">
          © 2026 TQuot · Hecho en España
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

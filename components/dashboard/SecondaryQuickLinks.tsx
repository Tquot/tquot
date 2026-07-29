import Link from "next/link";

interface SecondaryLink {
  href: string;
  label: string;
}

const LINKS: SecondaryLink[] = [
  { href: "/dashboard/connectors", label: "Integraciones" },
  { href: "/dashboard/settings/general", label: "Moneda" },
  { href: "/dashboard/inventory", label: "Inventario propio" },
  { href: "/dashboard/margins", label: "Márgenes" },
  { href: "/dashboard/settings/branding", label: "Identidad PDF" },
  { href: "/dashboard/settings/booking", label: "Configuración reservas" },
];

export function SecondaryQuickLinks() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-0 sm:grid-cols-3">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="border-b border-border-1 py-2.5 text-body-sm text-text-2 transition-colors duration-140 hover:border-border-3 hover:text-umber"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

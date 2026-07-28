import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface Action {
  href: string;
  label: string;
  description: string;
}

const ACTIONS: Action[] = [
  {
    href: "/dashboard/new-quote",
    label: "Nueva cotización",
    description: "Empieza desde una petición del cliente",
  },
  {
    href: "/dashboard/clients",
    label: "Nuevo cliente",
    description: "Añade o revisa clientes antes de cotizar",
  },
  {
    href: "/dashboard/settings/branding",
    label: "Configurar identidad",
    description: "Colores, logo y datos de tu PDF",
  },
  {
    href: "/dashboard/quotes?status=sent",
    label: "Cotizaciones enviadas",
    description: "Pendientes de respuesta del cliente",
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group flex items-baseline justify-between gap-4 border-b border-border-1 py-3 transition-colors duration-140 hover:border-border-3"
        >
          <div>
            <div className="text-body text-ink transition-colors duration-140 group-hover:text-umber">
              {action.label}
            </div>
            <div className="mt-0.5 text-body-sm text-text-2">
              {action.description}
            </div>
          </div>
          <ArrowUpRight
            size={16}
            strokeWidth={1.5}
            className="text-text-3 transition-all duration-180 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-umber"
          />
        </Link>
      ))}
    </div>
  );
}

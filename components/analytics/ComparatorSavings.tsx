import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { AgencyAnalytics } from "@/lib/analytics/types";

export function ComparatorSavings({
  comparator,
}: {
  comparator: AgencyAnalytics["comparator"];
}) {
  const coverage =
    comparator.total_quotes > 0
      ? Math.round((comparator.runs / comparator.total_quotes) * 100)
      : 0;

  return (
    <section>
      <Eyebrow className="block mb-4">Ahorro del comparador</Eyebrow>

      {comparator.runs === 0 ? (
        <div className="bg-paper-2 border border-border-1 rounded-lg p-5">
          <p className="text-body text-text leading-relaxed mb-3">
            No has usado el comparador en este periodo. Compara el mismo hotel
            entre proveedores antes de confirmar y verás aquí cuánto neto te
            ahorras.
          </p>
          <Link
            href="/dashboard/new-quote"
            className="text-body-sm font-medium text-ink hover:text-accent transition-colors"
          >
            Probar en una cotización →
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span
              className="font-serif text-[48px] leading-none text-accent tabular-nums"
              style={{ fontWeight: 500 }}
            >
              {Math.round(comparator.saving).toLocaleString("es-ES")}
            </span>
            <span className="text-h3 text-text-2">€</span>
          </div>
          <div className="h-0.5 w-12 bg-accent mt-3 mb-4" />

          <p className="text-body-sm text-text leading-relaxed">
            En {comparator.runs} de {comparator.total_quotes} cotizaciones donde
            comparaste.
          </p>
          <p className="mt-1 text-[11px] text-text-3 leading-relaxed max-w-[380px]">
            Estimación frente al precio mediano de los proveedores disponibles en
            cada comparación. No incluye comparaciones con un solo proveedor
            disponible.
          </p>

          {coverage < 50 && (
            <p className="mt-4 text-body-sm text-text-2 leading-relaxed border-l-2 border-border-2 pl-3">
              Solo comparaste en el {coverage} % de tus cotizaciones. Comparar
              en el resto podría subir esta cifra.
            </p>
          )}
        </>
      )}
    </section>
  );
}


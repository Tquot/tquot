import { Eyebrow } from "@/components/ui/Eyebrow";
import type { AgencyAnalytics } from "@/lib/analytics/types";

const PROVIDER_ES: Record<string, string> = {
  hotelbeds: "Hotelbeds",
  booking: "Booking.com",
  duffel: "Duffel",
  own: "Inventario propio",
  ratehawk: "RateHawk",
  viator: "Viator",
  civitatis: "Civitatis",
  battleface: "Battleface",
};

export function ProvidersTable({
  providers,
}: {
  providers: AgencyAnalytics["providers"];
}) {
  if (providers.length === 0) return null;

  const lowPerformers = providers.filter(
    (p) => p.appearances >= 10 && p.win_rate_pct < 10,
  );

  return (
    <section>
      <Eyebrow className="block mb-1">Proveedores</Eyebrow>
      <p className="text-[12px] text-text-3 mb-5">
        Cuántas veces apareció cada uno y cuántas lo elegiste.
      </p>

      <div className="border-t border-border-2">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 py-2.5 border-b border-border-2">
          <span className="eyebrow">Proveedor</span>
          <span className="eyebrow text-right w-24">Apariciones</span>
          <span className="eyebrow text-right w-20">Elegido</span>
          <span className="eyebrow text-right w-20">Ratio</span>
        </div>

        {providers.map((p) => (
          <div
            key={p.name}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-4 py-3 border-b border-border-1 items-baseline"
          >
            <span
              className="font-serif text-[17px] text-ink"
              style={{ fontWeight: 500 }}
            >
              {PROVIDER_ES[p.name] ?? p.name}
            </span>
            <span className="font-mono text-mono-md text-text-2 tabular-nums text-right w-24">
              {p.appearances}
            </span>
            <span className="font-mono text-mono-md text-ink tabular-nums text-right w-20">
              {p.chosen}
            </span>
            <span className="font-mono text-mono-md text-text-2 tabular-nums text-right w-20">
              {p.win_rate_pct} %
            </span>
          </div>
        ))}
      </div>

      {lowPerformers.length > 0 && (
        <p className="mt-4 text-body-sm text-text-2 leading-relaxed border-l-2 border-border-2 pl-3">
          {lowPerformers.map((p) => PROVIDER_ES[p.name] ?? p.name).join(" y ")}
          {lowPerformers.length === 1 ? " aparece" : " aparecen"} a menudo pero
          casi nunca
          {lowPerformers.length === 1 ? " se elige" : " se eligen"}. Revisa
          si merece la pena mantener la conexión.
        </p>
      )}
    </section>
  );
}


import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";

interface Provider {
  code: string;
  name: string;
  description: string;
  totalPrice?: number;
  perNightPrice?: number;
  status: "cheapest" | "available" | "unconnected";
}

const PROVIDERS: Provider[] = [
  {
    code: "HB",
    name: "Hotelbeds",
    description: "Tarifa neta · Hab. doble estándar",
    totalPrice: 1440,
    perNightPrice: 120,
    status: "cheapest",
  },
  {
    code: "TI",
    name: "Tu inventario",
    description: "Tarifa negociada directa",
    totalPrice: 1560,
    perNightPrice: 130,
    status: "available",
  },
  {
    code: "BK",
    name: "Booking.com",
    description: "Tarifa pública",
    totalPrice: 1896,
    perNightPrice: 158,
    status: "available",
  },
  {
    code: "RH",
    name: "RateHawk",
    description: "Conecta tu cuenta para ver precio",
    status: "unconnected",
  },
  {
    code: "W2",
    name: "W2M World to Meet",
    description: "Conecta tu cuenta para ver precio",
    status: "unconnected",
  },
];

export function ComparatorBlock() {
  return (
    <section id="comparador" className="py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">Comparador pre-reserva</Eyebrow>
        <h2 className="mb-3 max-w-[680px] font-serif text-h1 text-ink" style={{ fontWeight: 500 }}>
          ¿Dónde está más barato ese hotel ahora mismo?
        </h2>
        <p className="mb-10 max-w-[640px] text-[17px] text-text-2">
          TQuot consulta todos tus proveedores en paralelo y muestra el ranking
          en segundos.
        </p>

        <div className="max-w-[900px] overflow-hidden rounded-lg border border-border-1 bg-paper shadow-card">
          <header className="border-b border-border-1 bg-paper-2 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-[20px] leading-tight text-ink" style={{ fontWeight: 500 }}>
                  Barceló Teguise Beach
                </h3>
                <p className="mt-1 font-mono text-[12px] text-text-2">
                  Playa Blanca · 6–18 ago · 2 adultos · 12 noches
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-text-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
                Comparado en 2.1 s
              </span>
            </div>
          </header>

          <div className="divide-y divide-border-1">
            {PROVIDERS.map((provider) => (
              <ComparatorRow key={provider.code} provider={provider} />
            ))}
          </div>

          <div className="bg-ink px-5 py-4 text-paper">
            <div className="flex items-start gap-3">
              <div
                className="shrink-0 font-serif text-[28px] leading-none text-umber sm:text-[36px]"
                style={{ fontWeight: 500 }}
              >
                456 €
              </div>
              <div className="flex-1">
                <p className="text-[14px] leading-relaxed">
                  <span className="font-medium text-paper">Ahorro con Hotelbeds</span>
                  <span className="text-paper/70">
                    {" "}
                    vs Booking en esta reserva.
                  </span>
                </p>
                <p className="mt-1 font-mono text-[12px] text-paper/60">
                  10 reservas similares al mes → +4 560 € de margen adicional
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparatorRow({ provider }: { provider: Provider }) {
  const isCheapest = provider.status === "cheapest";
  const isUnconnected = provider.status === "unconnected";

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-5 py-4",
        isCheapest && "bg-paper-2/50",
        isUnconnected && "opacity-70",
      )}
    >
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-md font-mono text-mono-sm font-semibold",
          isCheapest ? "bg-ink text-paper" : "bg-paper-3 text-ink",
          isUnconnected && "text-text-2",
        )}
      >
        {provider.code}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <span className={cn("text-body-sm font-medium", isUnconnected ? "text-text-2" : "text-ink")}>
            {provider.name}
          </span>
          {isCheapest ? (
            <span className="rounded-full bg-umber/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-umber">
              Más barato
            </span>
          ) : null}
        </div>
        <p className={cn("font-mono text-[11px]", isUnconnected ? "text-text-3" : "text-text-2")}>
          {provider.description}
        </p>
      </div>
      {!isUnconnected && provider.totalPrice ? (
        <div className="shrink-0 text-right">
          <div
            className="font-serif text-[22px] leading-none text-ink tabular-nums sm:text-[28px]"
            style={{ fontWeight: 500 }}
          >
            {provider.totalPrice.toLocaleString("es-ES")} €
          </div>
          <div className="mt-1 font-mono text-[11px] text-text-2">
            {provider.perNightPrice} €/noche
          </div>
        </div>
      ) : null}
      {isUnconnected ? (
        <button className="shrink-0 text-body-sm font-medium text-ink transition-colors hover:text-umber">
          Conectar →
        </button>
      ) : (
        <button
          className={cn(
            "hidden h-8 shrink-0 items-center rounded-md px-3 text-[12px] font-medium transition-colors sm:inline-flex",
            isCheapest
              ? "bg-ink text-paper hover:bg-ink-2"
              : "border border-border-2 text-ink hover:bg-paper-2",
          )}
        >
          Usar
        </button>
      )}
    </div>
  );
}

import { Eyebrow } from "@/components/ui/Eyebrow";

export function PDFShowcase() {
  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">PDF profesional</Eyebrow>
        <h2 className="mb-3 max-w-[680px] font-serif text-h1 text-ink" style={{ fontWeight: 500 }}>
          Dos PDFs. Uno para ti, uno para el cliente.
        </h2>
        <p className="mb-10 max-w-[640px] text-[17px] text-text-2">
          El PDF del agente incluye costes netos y márgenes. El del cliente solo
          ve la propuesta final con tu marca.
        </p>
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_360px]">
          <FeatureList />
          <PDFMockup />
        </div>
      </div>
    </section>
  );
}

function FeatureList() {
  const items = [
    "Logo y colores de tu agencia en portada y pie de cada página.",
    "Foto del hotel y descripción narrativa generada con IA.",
    "Itinerario día a día con vuelos, hospedaje y actividades.",
    "Condiciones, notas internas y márgenes solo en la versión agente.",
    "Recomendaciones de seguro, visa, eSIM y guías locales contextualizadas.",
  ];

  return (
    <ul className="space-y-3 text-body text-text">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 font-mono text-success">✓</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PDFMockup() {
  return (
    <div className="overflow-hidden rounded-lg border border-border-1 bg-paper shadow-card-hover">
      <div className="bg-ink px-5 py-4 text-paper">
        <span className="font-mono text-[10px] uppercase tracking-wider text-paper/60">
          Cotización · Versión cliente
        </span>
        <h3 className="mt-1 font-serif text-[20px] text-paper" style={{ fontWeight: 500 }}>
          Viajes Ejemplo
        </h3>
        <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-paper/70">
          <span>TQ-20260806-LZT</span>
          <span>·</span>
          <span>Familia García</span>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <PDFSection label="Vuelos">
          <PDFLine left={<>MAD → ACE · Vueling · 6 ago</>} right="187 €" />
          <PDFLine left={<>ACE → MAD · Vueling · 18 ago</>} right="187 €" />
        </PDFSection>
        <PDFSection label="Alojamiento">
          <div className="flex items-baseline justify-between gap-3 border-b border-border-1 py-1.5 text-body-sm">
            <div>
              <div className="font-serif text-[14px] leading-tight text-ink" style={{ fontWeight: 500 }}>
                Barceló Teguise Beach
              </div>
              <span className="text-[11px] text-text-2">★★★★ · 12 noches · SA</span>
            </div>
            <span className="font-mono text-ink">1 440 €</span>
          </div>
        </PDFSection>
        <PDFSection label="Extras">
          <PDFLine left="Timanfaya + Snorkel Papagayo · 2 pax" right="166 €" />
          <PDFLine left="Alquiler coche 12 días · Clase B" right="312 €" />
          <PDFLine left="Seguro viaje básico · 2 pax" right="96 €" />
        </PDFSection>
        <div className="mt-2 flex items-end justify-between border-t-2 border-ink pt-3">
          <div>
            <span className="eyebrow">Total cliente</span>
            <div className="mt-1 h-0.5 w-8 bg-umber" />
          </div>
          <div className="font-serif text-[28px] leading-none text-ink tabular-nums" style={{ fontWeight: 500 }}>
            2 388 €
          </div>
        </div>
      </div>
    </div>
  );
}

function PDFSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="eyebrow mb-2 block">{label}</span>
      <div className="space-y-1.5 text-body-sm">{children}</div>
    </div>
  );
}

function PDFLine({
  left,
  right,
}: {
  left: React.ReactNode;
  right: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-1 py-1.5">
      <span className="text-text">{left}</span>
      <span className="font-mono text-ink">{right}</span>
    </div>
  );
}

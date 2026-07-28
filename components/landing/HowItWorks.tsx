import { Eyebrow } from "@/components/ui/Eyebrow";

const STEPS = [
  {
    n: "01",
    title: "Pega la petición tal cual te llegó.",
    body: "Email, WhatsApp o notas sueltas. Sin formularios ni plantillas rígidas. TQuot la entiende incluso si está mal escrita.",
  },
  {
    n: "02",
    title: "TQuot busca en todos tus proveedores.",
    body: "Inventario propio primero, luego APIs conectadas y comparador pre-reserva. Compara precios netos automáticamente.",
  },
  {
    n: "03",
    title: "Cotización lista para enviar.",
    body: "PDF agente y cliente, márgenes aplicados y refinamiento por chat si hace falta.",
  },
];

export function HowItWorks() {
  return (
    <section id="flujo" className="border-y border-border-1 bg-paper-2 py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">Cómo funciona</Eyebrow>
        <h2 className="mb-12 max-w-[640px] font-serif text-h1 text-ink sm:mb-16" style={{ fontWeight: 500 }}>
          Pegas la petición. TQuot busca. Tú revisas.
        </h2>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <div key={step.n} className="space-y-4">
              <div className="font-mono text-[48px] leading-none text-umber tabular-nums" style={{ fontWeight: 500 }}>
                {step.n}
              </div>
              <h3 className="font-serif text-h2 leading-snug text-ink" style={{ fontWeight: 500 }}>
                {step.title}
              </h3>
              <p className="text-body leading-relaxed text-text">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

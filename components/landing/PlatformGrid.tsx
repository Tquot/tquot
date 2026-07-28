import { Eyebrow } from "@/components/ui/Eyebrow";

const FEATURES = [
  {
    title: "TQuot Agent con IA",
    body: "Interpreta peticiones complejas, resuelve aeropuertos y estructura el viaje automáticamente.",
  },
  {
    title: "Tu inventario primero",
    body: "Prioriza tarifas y paquetes propios antes de salir a mercado.",
  },
  {
    title: "Connectors con tus sistemas",
    body: "Hotelbeds, vuelos, actividades y más, conectados a tu flujo de cotización.",
  },
  {
    title: "Comparador pre-reserva",
    body: "Compara netos entre proveedores antes de confirmar con el cliente.",
  },
  {
    title: "PDF profesional doble",
    body: "Versión agente con márgenes y versión cliente con tu marca.",
  },
  {
    title: "Refinamiento conversacional",
    body: "Ajusta vuelos, hoteles o margen con instrucciones en lenguaje natural.",
  },
];

export function PlatformGrid() {
  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">Plataforma</Eyebrow>
        <h2 className="mb-12 max-w-[680px] font-serif text-h1 text-ink" style={{ fontWeight: 500 }}>
          Todo lo que tu agencia necesita para cotizar.
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-12 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title}>
              <h3 className="mb-2 font-serif text-h3 text-ink" style={{ fontWeight: 500 }}>
                {feature.title}
              </h3>
              <p className="text-body-sm leading-relaxed text-text-2">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

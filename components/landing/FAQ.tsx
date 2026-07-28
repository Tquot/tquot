import { Eyebrow } from "@/components/ui/Eyebrow";

const QUESTIONS = [
  {
    q: "¿TQuot hace reservas?",
    a: "No. TQuot cotiza y compara precios. La reserva la realizas tú directamente en el extranet del proveedor. Mantienes el control total y cumples con la normativa de agencias de viajes.",
  },
  {
    q: "¿Necesito contratos con los proveedores?",
    a: "Sí. TQuot usa tus credenciales de Hotelbeds, Duffel y demás. Los precios que ves son los tuyos, no revendemos tarifas. Si no tienes alguna integración, te ayudamos a darte de alta.",
  },
  {
    q: "¿Cómo funciona el inventario propio?",
    a: "Subes tus hoteles negociados, paquetes y experiencias propias. TQuot los muestra primero en cada cotización. Si no hay suficientes opciones, completa con APIs conectadas automáticamente.",
  },
  {
    q: "¿Es seguro guardar las credenciales de mis proveedores?",
    a: "Las credenciales se cifran en reposo y solo se descifran en el momento de consultar al proveedor. Cumplimos RGPD. Puedes revocar el acceso en cualquier momento desde tu panel.",
  },
];

export function FAQ() {
  return (
    <section className="border-y border-border-1 bg-paper-2 py-14 sm:py-20">
      <div className="mx-auto max-w-[820px] px-5">
        <Eyebrow className="mb-3 block">Preguntas frecuentes</Eyebrow>
        <h2 className="mb-10 font-serif text-h1 text-ink" style={{ fontWeight: 500 }}>
          Lo que suele preguntarse.
        </h2>
        <div className="border-t border-border-2">
          {QUESTIONS.map((item, index) => (
            <details key={item.q} className="group border-b border-border-1" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5">
                <span className="font-serif text-[18px] font-medium text-ink" style={{ fontWeight: 500 }}>
                  {item.q}
                </span>
                <span className="shrink-0 font-mono text-[16px] text-text-2 transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="-mt-2 max-w-[640px] pb-5 text-body leading-relaxed text-text">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

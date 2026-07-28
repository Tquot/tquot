import { Eyebrow } from "@/components/ui/Eyebrow";

const ROI = [
  {
    value: "45×",
    label: "Reducción de tiempo",
    hint: "45 min → 60 seg por cotización",
  },
  {
    value: "+456 €",
    label: "Ahorro medio",
    hint: "por reserva con el comparador",
  },
  {
    value: "3×",
    label: "Más cotizaciones",
    hint: "con el mismo equipo",
  },
];

export function ROIBlock() {
  return (
    <section className="bg-ink py-14 text-paper sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block text-paper/60">Retorno</Eyebrow>
        <h2 className="mb-12 max-w-[640px] font-serif text-h1 text-paper" style={{ fontWeight: 500 }}>
          TQuot se paga solo en la primera semana.
        </h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-12">
          {ROI.map((item, index) => (
            <div
              key={item.value}
              className={"space-y-2 " + (index < 2 ? "sm:border-r sm:border-paper/15 sm:pr-8" : "")}
            >
              <div
                className="font-serif text-[56px] leading-none tracking-[-0.025em] text-umber sm:text-[72px]"
                style={{ fontWeight: 500 }}
              >
                {item.value}
              </div>
              <p className="text-body font-medium text-paper">{item.label}</p>
              <p className="font-mono text-body-sm text-paper/60">{item.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

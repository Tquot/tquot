import { Eyebrow } from "@/components/ui/Eyebrow";

interface Activity {
  category: string;
  name: string;
  description: string;
  duration: string;
  extra: string;
  pricePerPerson: number;
  provider: string;
  image: string;
}

const ACTIVITIES: Activity[] = [
  {
    category: "Naturaleza",
    name: "Parque Nacional de Timanfaya",
    description:
      "Día completo en el paisaje volcánico de las Montañas del Fuego. Almuerzo en El Diablo.",
    duration: "4 h",
    extra: "transporte incluido",
    pricePerPerson: 45,
    provider: "Tu inventario",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&h=800&fit=crop",
  },
  {
    category: "Acuático",
    name: "Snorkel en Papagayo",
    description:
      "Reserva natural de Los Ajaches. Equipo incluido, guía bilingüe y transporte desde Playa Blanca.",
    duration: "3 h",
    extra: "equipo incluido",
    pricePerPerson: 38,
    provider: "Hotelbeds",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&h=800&fit=crop",
  },
  {
    category: "Aventura",
    name: "Ruta en buggy por la isla",
    description:
      "Dunas, volcanes y playas vírgenes en una jornada. Recorrido escénico de la isla.",
    duration: "5 h",
    extra: "máx 8 pax",
    pricePerPerson: 75,
    provider: "Hotelbeds",
    image:
      "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1200&h=800&fit=crop",
  },
];

export function ActivitiesSection() {
  return (
    <section className="border-y border-border-1 bg-paper-2 py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">Actividades y experiencias</Eyebrow>
        <h2 className="mb-3 max-w-[680px] font-serif text-h1 text-ink" style={{ fontWeight: 500 }}>
          Excursiones, tours y experiencias locales.
        </h2>
        <p className="mb-10 max-w-[640px] text-[17px] text-text-2">
          Desde tu inventario propio o desde los catálogos de Hotelbeds
          Activities y Viator.
        </p>
        <div className="grid max-w-[1000px] grid-cols-1 gap-4 sm:grid-cols-3">
          {ACTIVITIES.map((activity) => (
            <ActivityCard key={activity.name} activity={activity} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <article className="overflow-hidden rounded-lg border border-border-1 bg-paper shadow-card">
      <div className="relative aspect-[16/9] overflow-hidden bg-paper-3">
        <img src={activity.image} alt={activity.name} className="h-full w-full object-cover" />
        <span className="absolute top-2 left-2 rounded-full bg-paper/95 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink backdrop-blur-sm">
          {activity.provider}
        </span>
      </div>
      <div className="p-4">
        <Eyebrow className="mb-2 block text-umber">{activity.category}</Eyebrow>
        <h3 className="mb-2 font-serif text-[17px] leading-tight text-ink" style={{ fontWeight: 500 }}>
          {activity.name}
        </h3>
        <p className="mb-3 text-body-sm leading-relaxed text-text-2">
          {activity.description}
        </p>
        <div className="mb-3 flex items-center justify-between font-mono text-[11px] text-text-2">
          <span>{activity.duration}</span>
          <span>{activity.extra}</span>
        </div>
        <div className="flex items-end justify-between border-t border-border-1 pt-3">
          <div>
            <Eyebrow>/ persona</Eyebrow>
            <div className="mt-0.5 font-mono text-[16px] text-ink">
              {activity.pricePerPerson} €
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

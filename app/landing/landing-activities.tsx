import type { DashboardTranslation } from "@/app/dashboard/translations";
import { SectionIntro } from "./section-intro";

type Props = { t: DashboardTranslation };

const ACTIVITIES = [
  {
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=140&fit=crop",
    catKey: "landingActivity1Cat" as const,
    nameKey: "landingActivity1Name" as const,
    descKey: "landingActivity1Desc" as const,
    metaKey: "landingActivity1Meta" as const,
    price: "€45",
    sourceKey: "landingHotelSourceOwn" as const,
    sourceClass: "border-amber-200 bg-amber-50 text-amber-900",
  },
  {
    image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=140&fit=crop",
    catKey: "landingActivity2Cat" as const,
    nameKey: "landingActivity2Name" as const,
    descKey: "landingActivity2Desc" as const,
    metaKey: "landingActivity2Meta" as const,
    price: "€38",
    sourceKey: "landingConnectorHotelbeds" as const,
    sourceClass: "border-tquot-teal/30 bg-tquot-teal/10 text-tquot-teal",
  },
  {
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=140&fit=crop",
    catKey: "landingActivity3Cat" as const,
    nameKey: "landingActivity3Name" as const,
    descKey: "landingActivity3Desc" as const,
    metaKey: "landingActivity3Meta" as const,
    price: "€75",
    sourceKey: "landingConnectorHotelbeds" as const,
    sourceClass: "border-tquot-teal/30 bg-tquot-teal/10 text-tquot-teal",
  },
] as const;

export function LandingActivities({ t }: Props) {
  return (
    <section id="actividades" className="scroll-mt-24 bg-tquot-surface py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionIntro
          eyebrow={t.landingActivitiesEyebrow}
          title={t.landingActivitiesTitle}
          subtitle={t.landingActivitiesSubtitle}
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ACTIVITIES.map((activity) => (
            <article
              key={activity.nameKey}
              className="overflow-hidden rounded-2xl border border-tquot-border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <img
                src={activity.image}
                alt={t[activity.nameKey]}
                className="h-36 w-full object-cover"
                loading="lazy"
              />
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-tquot-teal">
                  {t[activity.catKey]}
                </p>
                <h3 className="mt-1 font-bold text-tquot-navy">{t[activity.nameKey]}</h3>
                <p className="mt-2 text-xs leading-relaxed text-tquot-muted">
                  {t[activity.descKey]}
                </p>
                <p className="mt-2 text-[11px] text-tquot-muted">{t[activity.metaKey]}</p>
              </div>
              <div className="flex items-center justify-between border-t border-tquot-border px-4 py-3">
                <div>
                  <p className="text-base font-extrabold text-tquot-teal">{activity.price}</p>
                  <p className="text-[10px] text-tquot-muted">{t.landingActivityPricePp}</p>
                </div>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${activity.sourceClass}`}
                >
                  {t[activity.sourceKey]}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

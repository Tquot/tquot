"use client";

import { useSiteLanguage } from "@/app/language-provider";
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

export function ActivitiesSection() {
  const { t } = useSiteLanguage();

  const ACTIVITIES: Activity[] = [
    {
      category: t.landingActivity1CatShort,
      name: t.landingActivity1Name,
      description: t.landingActivity1DescShort,
      duration: t.landingActivity1Duration,
      extra: t.landingActivity1Extra,
      pricePerPerson: 45,
      provider: t.landingHotelSourceOwnShort,
      image:
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&h=800&fit=crop",
    },
    {
      category: t.landingActivity2CatShort,
      name: t.landingActivity2Name,
      description: t.landingActivity2DescShort,
      duration: t.landingActivity2Duration,
      extra: t.landingActivity2Extra,
      pricePerPerson: 38,
      provider: t.landingConnectorHotelbeds,
      image:
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&h=800&fit=crop",
    },
    {
      category: t.landingActivity3CatShort,
      name: t.landingActivity3Name,
      description: t.landingActivity3DescShort,
      duration: t.landingActivity3Duration,
      extra: t.landingActivity3Extra,
      pricePerPerson: 75,
      provider: t.landingConnectorHotelbeds,
      image:
        "https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=1200&h=800&fit=crop",
    },
  ];

  return (
    <section className="border-y border-border-1 bg-paper-2 py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">{t.landingActivitiesEyebrow}</Eyebrow>
        <h2 className="mb-3 max-w-[680px] font-serif text-h1 text-ink" style={{ fontWeight: 500 }}>
          {t.landingActivitiesTitle}
        </h2>
        <p className="mb-10 max-w-[640px] text-[17px] text-text-2">
          {t.landingActivitiesSubtitle}
        </p>
        <div className="grid max-w-[1000px] grid-cols-1 gap-4 sm:grid-cols-3">
          {ACTIVITIES.map((activity) => (
            <ActivityCard
              key={activity.name}
              activity={activity}
              perPerson={t.landingActivityPerPerson}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ActivityCard({
  activity,
  perPerson,
}: {
  activity: Activity;
  perPerson: string;
}) {
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
            <Eyebrow>{perPerson}</Eyebrow>
            <div className="mt-0.5 font-mono text-[16px] text-ink">
              {activity.pricePerPerson} €
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

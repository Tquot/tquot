import type { DashboardTranslation } from "@/app/dashboard/translations";
import { SectionIntro } from "./section-intro";

type Props = { t: DashboardTranslation };

type HotelCard = {
  image: string;
  nameKey: keyof DashboardTranslation;
  stars: string;
  locKey: keyof DashboardTranslation;
  sourceKey: keyof DashboardTranslation;
  sourceClass: string;
  price: string;
  selected?: boolean;
};

const HOTELS: HotelCard[] = [
  {
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=160&fit=crop",
    nameKey: "landingHotel1Name",
    stars: "★★★★",
    locKey: "landingHotel1Loc",
    sourceKey: "landingHotelSourceOwn",
    sourceClass: "border-amber-200 bg-amber-50 text-amber-900",
    price: "€120",
    selected: true,
  },
  {
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=160&fit=crop",
    nameKey: "landingHotel2Name",
    stars: "★★★★★",
    locKey: "landingHotel2Loc",
    sourceKey: "landingConnectorHotelbeds",
    sourceClass: "border-tquot-teal/30 bg-tquot-teal/10 text-tquot-teal",
    price: "€187",
  },
  {
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&h=160&fit=crop",
    nameKey: "landingHotel3Name",
    stars: "★★★★★",
    locKey: "landingHotel3Loc",
    sourceKey: "landingConnectorBooking",
    sourceClass: "border-blue-200 bg-blue-50 text-tquot-accent",
    price: "€215",
  },
  {
    image: "https://images.unsplash.com/photo-1540541338537-1220059c0e4e?w=400&h=160&fit=crop",
    nameKey: "landingHotel4Name",
    stars: "★★★★★",
    locKey: "landingHotel4Loc",
    sourceKey: "landingConnectorHotelbeds",
    sourceClass: "border-tquot-teal/30 bg-tquot-teal/10 text-tquot-teal",
    price: "€165",
  },
];

export function LandingHotels({ t }: Props) {
  return (
    <section id="hoteles" className="scroll-mt-24 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <SectionIntro
          eyebrow={t.landingHotelsEyebrow}
          title={t.landingHotelsTitle}
          subtitle={t.landingHotelsSubtitle}
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {HOTELS.map((hotel) => (
            <article
              key={hotel.nameKey}
              className={`overflow-hidden rounded-2xl border bg-tquot-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                hotel.selected
                  ? "border-2 border-tquot-teal ring-2 ring-tquot-teal/20"
                  : "border-tquot-border hover:border-tquot-teal/35"
              }`}
            >
              <img
                src={hotel.image}
                alt={t[hotel.nameKey]}
                className="h-40 w-full object-cover"
                loading="lazy"
              />
              <div className="p-4">
                <h3 className="font-bold text-tquot-navy">{t[hotel.nameKey]}</h3>
                <p className="text-sm text-amber-500">{hotel.stars}</p>
                <p className="mt-1 text-xs text-tquot-muted">{t[hotel.locKey]}</p>
                <span
                  className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold ${hotel.sourceClass}`}
                >
                  {t[hotel.sourceKey]}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-tquot-border bg-tquot-bg/50 px-4 py-3">
                <div>
                  <p className="text-[10px] text-tquot-muted">{t.landingHotelPriceLabel}</p>
                  <p className="text-lg font-extrabold text-tquot-teal">{hotel.price}</p>
                </div>
                {hotel.selected ? (
                  <span className="rounded-lg bg-tquot-teal px-3 py-1.5 text-xs font-bold text-white">
                    {t.landingHotelSelected}
                  </span>
                ) : (
                  <span className="rounded-lg border border-tquot-border bg-white px-3 py-1.5 text-xs font-semibold text-tquot-text">
                    {t.landingMockFlightUse}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useSiteLanguage } from "@/app/language-provider";
import { Eyebrow } from "@/components/ui/Eyebrow";

type ProviderId = "own" | "hotelbeds" | "booking";

interface HotelData {
  name: string;
  stars: number;
  location: string;
  board: string;
  pricePerNight: number;
  provider: ProviderId;
  image: string;
  selected?: boolean;
}

export function InventorySection() {
  const { t } = useSiteLanguage();

  const providerLabels: Record<ProviderId, string> = {
    own: t.landingHotelSourceOwnShort,
    hotelbeds: t.landingConnectorHotelbeds,
    booking: t.landingConnectorBooking,
  };

  const HOTELS: HotelData[] = [
    {
      name: t.landingHotel1Name,
      stars: 4,
      location: t.landingHotelLocation,
      board: t.landingHotel1Board,
      pricePerNight: 120,
      provider: "own",
      image:
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&h=800&fit=crop",
      selected: true,
    },
    {
      name: t.landingHotel2Name,
      stars: 5,
      location: t.landingHotelLocation,
      board: t.landingHotel2Board,
      pricePerNight: 187,
      provider: "hotelbeds",
      image:
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&h=800&fit=crop",
    },
    {
      name: t.landingHotel3Name,
      stars: 5,
      location: t.landingHotelLocation,
      board: t.landingHotel3Board,
      pricePerNight: 215,
      provider: "booking",
      image:
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&h=800&fit=crop",
    },
    {
      name: t.landingHotel4Name,
      stars: 5,
      location: t.landingHotelLocation,
      board: t.landingHotel4Board,
      pricePerNight: 165,
      provider: "hotelbeds",
      image:
        "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&h=800&fit=crop",
    },
  ];

  return (
    <section id="hoteles" className="py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">{t.landingHotelsEyebrow}</Eyebrow>
        <h2 className="mb-3 max-w-[680px] font-serif text-h1 text-ink" style={{ fontWeight: 500 }}>
          {t.landingHotelsTitle}
        </h2>
        <p className="mb-10 max-w-[640px] text-[17px] text-text-2">
          {t.landingHotelsSubtitle}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOTELS.map((hotel) => (
            <HotelCard
              key={hotel.name}
              hotel={hotel}
              providerLabel={providerLabels[hotel.provider]}
              perNight={t.landingHotelPerNight}
              selectedLabel={t.landingHotelSelected}
              useLabel={t.landingHotelUse}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function HotelCard({
  hotel,
  providerLabel,
  perNight,
  selectedLabel,
  useLabel,
}: {
  hotel: HotelData;
  providerLabel: string;
  perNight: string;
  selectedLabel: string;
  useLabel: string;
}) {
  const isOwn = hotel.provider === "own";

  return (
    <article
      className={
        "group overflow-hidden rounded-lg bg-paper transition-shadow duration-180 " +
        (hotel.selected
          ? "border-2 border-ink shadow-card-hover"
          : "border border-border-1 shadow-card hover:shadow-card-hover")
      }
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-paper-3">
        <img
          src={hotel.image}
          alt={hotel.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ink/40 to-transparent" />
        <span
          className={
            "absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider " +
            (isOwn
              ? "bg-umber/95 text-paper"
              : "bg-paper/95 text-ink backdrop-blur-sm")
          }
        >
          {providerLabel}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-serif text-[18px] leading-tight text-ink" style={{ fontWeight: 500 }}>
          {hotel.name}
        </h3>
        <div className="mt-1 text-[10px] tracking-wider text-umber">
          {"★".repeat(hotel.stars)}
        </div>
        <p className="mt-2 text-[12px] text-text-2">
          {hotel.location} · {hotel.board}
        </p>
        <div className="mt-3 flex items-end justify-between border-t border-border-1 pt-3">
          <div>
            <Eyebrow>{perNight}</Eyebrow>
            <div className="mt-0.5 font-mono text-[18px] text-ink tabular-nums">
              {hotel.pricePerNight} €
            </div>
          </div>
          {hotel.selected ? (
            <span className="text-[11px] font-medium text-success">
              {selectedLabel}
            </span>
          ) : (
            <button className="text-[11px] font-medium text-ink transition-colors hover:text-umber">
              {useLabel}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

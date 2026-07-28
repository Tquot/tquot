"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Star,
  ChevronDown,
  ChevronUp,
  MapPin,
  Wifi,
  Coffee,
  Waves,
  Car,
} from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/Badge";
import { BookingHandoffButton } from "@/components/booking-handoff/BookingHandoffButton";
import { BoardChips } from "@/components/quote-canvas/BoardChips";
import { AccessibilityBadge } from "@/components/accessibility/AccessibilityBadge";
import { matchesHotel } from "@/lib/accessibility/match";
import type { AccessibilityProfile } from "@/lib/accessibility/types";
import { cn } from "@/lib/utils";
import type { BoardCode, Hotel } from "@/lib/quote-engine/types";
import type { BookingHandoff } from "@/lib/booking-handoff/types";

interface Props {
  hotel: Hotel;
  quoteId?: string;
  handoff: BookingHandoff | null;
  index?: number;
  accessibilityProfile?: AccessibilityProfile;
  onBoardUpdated?: (update: {
    hotelId: string;
    boardCode: BoardCode;
    netPricePerNight: number;
    totalPrice: number;
    rateKey?: string;
    currency: string;
    fetchedAt: string;
  }) => void;
  comparatorSlot?: React.ReactNode;
}

const PROVIDER_LABEL: Record<string, string> = {
  hotelbeds: "Hotelbeds",
  booking: "Booking",
  own: "Inventario propio",
};

const AMENITY_ICONS: Record<
  string,
  React.ComponentType<{ size?: number; strokeWidth?: number }>
> = {
  wifi: Wifi,
  breakfast: Coffee,
  pool: Waves,
  parking: Car,
};

export function HotelCard({
  hotel,
  handoff,
  index = 0,
  accessibilityProfile,
  onBoardUpdated,
  comparatorSlot,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [currentPrice, setCurrentPrice] = useState({
    netPrice: hotel.netPrice,
    boardCode: hotel.boardCode,
    totalPrice: hotel.netPrice * Math.max(1, hotel.nights),
  });

  const nights = Math.max(1, hotel.nights);
  const totalPrice = Math.round(currentPrice.totalPrice);
  const photos =
    hotel.images && hotel.images.length > 0
      ? hotel.images
      : ([hotel.imageUrl].filter(Boolean) as string[]);
  const heroPhoto = photos[0];
  const staggerDelay = Math.min(index, 5) * 80;
  const match = matchesHotel(accessibilityProfile, hotel.accessibility);
  const dimmed = Boolean(match && !match.matches);

  return (
    <article
      key={hotel.id}
      className={cn(
        "group overflow-hidden rounded-lg border border-border-1 bg-paper",
        "shadow-card transition-shadow duration-180",
        "hover:shadow-card-hover",
        "animate-slide-up-fade",
        dimmed && "opacity-60",
      )}
      style={{ animationDelay: `${staggerDelay}ms` }}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-paper-3">
        {heroPhoto ? (
          <Image
            src={heroPhoto}
            alt={hotel.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className={cn(
              "object-cover",
              "transition-transform duration-700 group-hover:scale-[1.02]",
              "animate-photo-reveal",
            )}
            priority={index < 2}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-text-3">
            <MapPin size={32} strokeWidth={1.5} />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink/40 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink/50 to-transparent" />

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <Badge tone="ink" className="bg-paper/95 text-ink backdrop-blur-sm">
            {PROVIDER_LABEL[hotel.provider] ?? hotel.provider}
          </Badge>
          <AccessibilityBadge info={hotel.accessibility} match={match} />
        </div>

        <div className="absolute right-3 top-3 text-right">
          <div className="rounded-md bg-paper/95 px-3 py-1.5 backdrop-blur-sm">
            <div className="font-mono text-h2 leading-none text-ink tabular-nums">
              {Math.round(currentPrice.netPrice)} {hotel.currency}
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-text-2">
              · NOCHE
            </div>
          </div>
        </div>

        {photos.length > 1 ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-paper/95 px-2.5 py-1 text-body-sm font-medium backdrop-blur-sm transition-colors hover:bg-paper"
          >
            +{photos.length - 1} fotos
            {expanded ? (
              <ChevronUp size={14} strokeWidth={1.5} />
            ) : (
              <ChevronDown size={14} strokeWidth={1.5} />
            )}
          </button>
        ) : null}
      </div>

      {expanded && photos.length > 1 ? (
        <div className="grid animate-slide-up-fade grid-cols-3 gap-1 bg-paper-3">
          {photos.slice(1, 7).map((photo, i) => (
            <div key={i} className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={photo}
                alt=""
                fill
                sizes="33vw"
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="p-5">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h3 className="font-serif text-[22px] leading-tight tracking-tight text-ink">
            {hotel.name}
          </h3>
          {hotel.stars > 0 ? (
            <div
              className="mt-1 flex shrink-0 items-center gap-0.5"
              aria-label={`${hotel.stars} estrellas`}
            >
              {Array.from({ length: hotel.stars }).map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  strokeWidth={0}
                  fill="currentColor"
                  className="text-umber"
                />
              ))}
            </div>
          ) : null}
        </div>

        {hotel.address ? (
          <div className="mb-4 flex items-center gap-1.5 text-body-sm text-text-2">
            <MapPin size={13} strokeWidth={1.5} />
            <span>{hotel.address}</span>
          </div>
        ) : null}

        {hotel.description ? (
          <p className="mb-4 line-clamp-3 text-body-sm leading-relaxed text-text">
            {hotel.description}
          </p>
        ) : null}

        {hotel.amenities && hotel.amenities.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-3">
            {hotel.amenities.slice(0, 6).map((amenity) => {
              const Icon = AMENITY_ICONS[amenity];
              return (
                <span
                  key={amenity}
                  className="inline-flex items-center gap-1.5 text-body-sm text-text-2"
                >
                  {Icon ? <Icon size={14} strokeWidth={1.5} /> : null}
                  <span>{amenityLabel(amenity)}</span>
                </span>
              );
            })}
          </div>
        ) : null}

        {hotel.boardOptions && hotel.boardOptions.length > 0 ? (
          <div className="mb-4 border-t border-border-1 pt-4">
            <Eyebrow className="mb-2 block">Régimen</Eyebrow>
            <BoardChips
              hotel={hotel}
              stayTotalPrice={currentPrice.totalPrice}
              onUpdate={(update) => {
                setCurrentPrice({
                  netPrice: update.netPricePerNight,
                  boardCode: update.boardCode,
                  totalPrice: update.totalPrice,
                });
                onBoardUpdated?.({ hotelId: hotel.id, ...update });
              }}
            />
          </div>
        ) : null}

        {hotel.refundable ? (
          <div className="mb-4 text-body-sm text-success">
            ✓ Cancelación gratuita
            {hotel.cancellationDeadline ? (
              <span className="text-text-2">
                {" "}
                hasta el {formatDate(hotel.cancellationDeadline)}
              </span>
            ) : null}
          </div>
        ) : null}

        {comparatorSlot}

        <div className="flex items-end justify-between border-t border-border-1 pt-4">
          <div>
            <Eyebrow>
              Total · {nights} {nights === 1 ? "noche" : "noches"}
            </Eyebrow>
            <div className="mt-0.5 font-mono text-h2 text-ink tabular-nums">
              {totalPrice.toLocaleString("es-ES")} {hotel.currency}
            </div>
          </div>
          {handoff ? <BookingHandoffButton handoff={handoff} /> : null}
        </div>
      </div>
    </article>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

function amenityLabel(key: string): string {
  return (
    (
      {
        wifi: "Wifi",
        breakfast: "Desayuno",
        pool: "Piscina",
        parking: "Parking",
        spa: "Spa",
        gym: "Gimnasio",
      } as Record<string, string>
    )[key] ?? key
  );
}

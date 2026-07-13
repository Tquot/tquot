"use client";

import { useState } from "react";
import { BookingHandoffButton } from "@/components/booking-handoff/BookingHandoffButton";
import { HotelDetailExpanded } from "@/components/quote-canvas/HotelDetailExpanded";
import type { BookingHandoff } from "@/lib/booking-handoff/types";
import type { Hotel } from "@/lib/quote-engine/types";

interface Props {
  hotel: Hotel;
  handoff: BookingHandoff | null;
}

export function HotelCard({ hotel, handoff }: Props) {
  const [expanded, setExpanded] = useState(false);
  const canExpand =
    hotel.provider === "hotelbeds" && Boolean(hotel.hotelCode || hotel.content);

  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex gap-3">
        {hotel.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hotel.imageUrl}
            alt={hotel.name}
            className="h-16 w-16 shrink-0 rounded object-cover"
            loading="lazy"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-neutral-900">{hotel.name}</h4>
          {hotel.stars > 0 ? (
            <p className="mt-1 text-sm text-neutral-500">
              {"★".repeat(hotel.stars)}
            </p>
          ) : null}
          {hotel.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-neutral-600">
              {hotel.description}
            </p>
          ) : null}
        </div>
      </div>

      <footer className="mt-3 flex items-center justify-between">
        <div className="text-sm font-semibold">
          {hotel.netPrice} {hotel.currency}/noche
        </div>
        {handoff && <BookingHandoffButton handoff={handoff} />}
      </footer>

      {canExpand ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs text-blue-600 hover:underline"
        >
          {expanded ? "Ocultar detalles" : "Ver detalles del hotel"}
        </button>
      ) : null}

      {expanded ? <HotelDetailExpanded hotel={hotel} /> : null}
    </article>
  );
}

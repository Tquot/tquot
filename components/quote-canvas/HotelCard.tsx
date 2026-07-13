"use client";

import { useState } from "react";
import { BookingHandoffButton } from "@/components/booking-handoff/BookingHandoffButton";
import { BoardChips } from "@/components/quote-canvas/BoardChips";
import { HotelDetailExpanded } from "@/components/quote-canvas/HotelDetailExpanded";
import type { BookingHandoff } from "@/lib/booking-handoff/types";
import type { BoardCode, Hotel } from "@/lib/quote-engine/types";

interface Props {
  hotel: Hotel;
  handoff: BookingHandoff | null;
  onBoardUpdated?: (update: {
    hotelId: string;
    boardCode: BoardCode;
    netPricePerNight: number;
    totalPrice: number;
    rateKey?: string;
    currency: string;
    fetchedAt: string;
  }) => void;
}

export function HotelCard({ hotel, handoff, onBoardUpdated }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [displayed, setDisplayed] = useState({
    netPrice: hotel.netPrice,
    boardCode: hotel.boardCode,
    totalPrice: hotel.netPrice * Math.max(1, hotel.nights),
  });
  const canExpand =
    hotel.provider === "hotelbeds" && Boolean(hotel.hotelCode || hotel.content);
  const hasBoards = (hotel.boardOptions?.length ?? 0) > 0;

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

      <div className="mt-3 flex items-end justify-between gap-3">
        {hasBoards ? (
          <BoardChips
            hotel={hotel}
            stayTotalPrice={displayed.totalPrice}
            onUpdate={(update) => {
              setDisplayed({
                netPrice: update.netPricePerNight,
                boardCode: update.boardCode,
                totalPrice: update.totalPrice,
              });
              onBoardUpdated?.({ hotelId: hotel.id, ...update });
            }}
          />
        ) : (
          <div />
        )}
        <div className="text-right">
          <div className="text-xs text-neutral-500">
            {hotel.nights} {hotel.nights === 1 ? "noche" : "noches"}
          </div>
          <div className="text-sm font-semibold">
            {Math.round(displayed.netPrice)} {hotel.currency}/noche
          </div>
          <div className="text-xs text-neutral-600">
            Total {Math.round(displayed.totalPrice)} {hotel.currency}
          </div>
        </div>
      </div>

      <footer className="mt-3 flex items-center justify-end">
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

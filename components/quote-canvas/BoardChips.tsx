"use client";

import { useEffect, useState, useTransition } from "react";
import { changeHotelBoard } from "@/lib/quote-engine/change-hotel-board";
import { getBoardShortCode } from "@/lib/providers/hotelbeds/board-mapping";
import type {
  BoardCode,
  BoardOption,
  Hotel,
} from "@/lib/quote-engine/types";

interface Props {
  hotel: Pick<
    Hotel,
    | "id"
    | "boardCode"
    | "boardOptions"
    | "netPrice"
    | "nights"
    | "currency"
    | "rateKey"
  > & {
    connectionId?: string;
  };
  /** Precio total estancia actual (QuoteItem.price). */
  stayTotalPrice?: number;
  onUpdate: (update: {
    boardCode: BoardCode;
    netPricePerNight: number;
    totalPrice: number;
    rateKey?: string;
    currency: string;
    fetchedAt: string;
  }) => void;
}

export function BoardChips({ hotel, stayTotalPrice, onUpdate }: Props) {
  const [pending, startTransition] = useTransition();
  const [pendingCode, setPendingCode] = useState<BoardCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<BoardCode | undefined>(
    hotel.boardCode,
  );

  useEffect(() => {
    setSelectedCode(hotel.boardCode);
  }, [hotel.boardCode]);

  const options = hotel.boardOptions ?? [];

  const handleClick = (option: BoardOption) => {
    if (option.boardCode === selectedCode) return;
    if (pending) return;

    setPendingCode(option.boardCode);
    setError(null);

    startTransition(async () => {
      const result = await changeHotelBoard({
        hotelId: hotel.id,
        newBoardCode: option.boardCode,
        hotel: {
          id: hotel.id,
          boardCode: selectedCode ?? hotel.boardCode,
          boardOptions: options,
          netPrice: stayTotalPrice ?? hotel.netPrice * Math.max(1, hotel.nights),
          nights: hotel.nights,
          currency: hotel.currency,
          connectionId: hotel.connectionId,
        },
      });
      setPendingCode(null);

      if (!result.success) {
        setError(translateError(result.error ?? "unknown"));
        window.setTimeout(() => setError(null), 4000);
        return;
      }

      setSelectedCode(option.boardCode);
      if (result.newTotalPrice != null && result.newNetPrice != null) {
        onUpdate({
          boardCode: result.boardCode ?? option.boardCode,
          netPricePerNight: result.newNetPrice,
          totalPrice: result.newTotalPrice,
          rateKey: result.rateKey,
          currency: result.currency ?? hotel.currency,
          fetchedAt: result.fetchedAt ?? new Date().toISOString(),
        });
      }
    });
  };

  if (options.length === 0) {
    if (!hotel.boardCode) return null;
    return (
      <span className="text-xs text-neutral-500">
        {getBoardShortCode(hotel.boardCode)}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {options.map((option) => {
          const isSelected = option.boardCode === selectedCode;
          const isPending = pendingCode === option.boardCode;

          return (
            <button
              key={option.boardCode}
              type="button"
              onClick={() => handleClick(option)}
              disabled={pending && !isPending}
              title={`${option.boardLabel} · ${Math.round(option.totalPrice)} ${option.currency} total`}
              className={`relative rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                isSelected
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              } ${pending && !isPending ? "opacity-50" : ""}`}
            >
              {isPending ? (
                <span className="inline-block animate-spin">⟳</span>
              ) : (
                getBoardShortCode(option.boardCode)
              )}
            </button>
          );
        })}
      </div>
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}

function translateError(code: string): string {
  if (code === "board_not_available") {
    return "Régimen no disponible para esta tarifa";
  }
  if (code === "rate_not_available" || code.includes("rate_check")) {
    return "La tarifa caducó. Recotiza el hotel.";
  }
  if (code.startsWith("http_")) return "Error de Hotelbeds. Reintenta.";
  if (code.includes("connection")) {
    return "Conexión Hotelbeds no disponible";
  }
  return "No se pudo actualizar el régimen";
}

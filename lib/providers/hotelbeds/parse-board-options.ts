import type { BoardOption } from "@/lib/quote-engine/types";
import { getBoardLabel, normalizeBoardCode } from "./board-mapping";

type RawRate = {
  boardCode?: string;
  rateKey?: string;
  net?: string | number;
  currency?: string;
  rateClass?: string;
  cancellationPolicies?: Array<{
    amount?: string | number;
    currency?: string;
    from?: string;
  }>;
  roomCode?: string;
};

type RawHotelLike = {
  rooms?: Array<{
    code?: string;
    rates?: RawRate[];
  }>;
};

type NormalizedRoomLike = {
  boardType?: string;
  netPrice: number;
  pricePerNight?: number;
  providerRoomCode: string;
  refundable?: boolean;
  currency?: string;
  rawData?: unknown;
};

/**
 * Agrupa rates Hotelbeds por boardCode y se queda con la más barata por régimen.
 */
export function parseBoardOptions(
  hotelData: RawHotelLike,
  nights: number,
): BoardOption[] {
  const rates: RawRate[] = [];
  for (const room of hotelData.rooms ?? []) {
    for (const rate of room.rates ?? []) {
      rates.push({ ...rate, roomCode: room.code });
    }
  }
  return boardOptionsFromRawRates(rates, nights);
}

/** Variante desde rooms ya normalizados por el adapter. */
export function parseBoardOptionsFromRooms(
  rooms: NormalizedRoomLike[],
  nights: number,
): BoardOption[] {
  const safeNights = Math.max(1, nights);
  const byBoard = new Map<string, BoardOption>();

  for (const room of rooms) {
    const code = normalizeBoardCode(
      room.boardType ??
        (room.rawData && typeof room.rawData === "object"
          ? String((room.rawData as RawRate).boardCode ?? "")
          : ""),
    );
    if (!code || code === "UNSPECIFIED") continue;
    const rateKey = room.providerRoomCode?.trim();
    if (!rateKey) continue;

    const total = Number(room.netPrice);
    if (!Number.isFinite(total) || total <= 0) continue;

    const raw =
      room.rawData && typeof room.rawData === "object"
        ? (room.rawData as RawRate)
        : undefined;
    const refundable =
      room.refundable ??
      !(raw?.rateClass && String(raw.rateClass).toUpperCase() === "NRF");
    const currency = room.currency ?? raw?.currency ?? "EUR";
    const option: BoardOption = {
      boardCode: code,
      boardLabel: getBoardLabel(code),
      rateKey,
      totalPrice: total,
      netPrice: total / safeNights,
      currency,
      refundable,
      cancellationPolicy: formatCancellation(raw, currency),
      available: true,
    };

    const existing = byBoard.get(code);
    if (!existing || option.totalPrice < existing.totalPrice) {
      byBoard.set(code, option);
    }
  }

  return [...byBoard.values()].sort((a, b) => a.totalPrice - b.totalPrice);
}

function boardOptionsFromRawRates(
  rates: RawRate[],
  nights: number,
): BoardOption[] {
  if (rates.length === 0) return [];
  const safeNights = Math.max(1, nights);
  const byBoard = new Map<string, RawRate>();

  for (const rate of rates) {
    const code = normalizeBoardCode(rate.boardCode);
    if (!code || !rate.rateKey) continue;
    const existing = byBoard.get(code);
    if (!existing || Number(rate.net) < Number(existing.net)) {
      byBoard.set(code, rate);
    }
  }

  const options: BoardOption[] = [];
  for (const [code, rate] of byBoard.entries()) {
    const total = Number(rate.net);
    if (!Number.isFinite(total) || total <= 0) continue;
    const currency = rate.currency ?? "EUR";
    options.push({
      boardCode: code,
      boardLabel: getBoardLabel(code),
      rateKey: String(rate.rateKey),
      totalPrice: total,
      netPrice: total / safeNights,
      currency,
      refundable: !rate.rateClass || rate.rateClass !== "NRF",
      cancellationPolicy: formatCancellation(rate, currency),
      available: true,
    });
  }

  return options.sort((a, b) => a.totalPrice - b.totalPrice);
}

function formatCancellation(
  rate: RawRate | undefined,
  currency: string,
): string | undefined {
  const cp = rate?.cancellationPolicies?.[0];
  if (!cp?.amount || !cp.from) return undefined;
  return `${cp.amount} ${cp.currency ?? currency} hasta ${cp.from}`;
}

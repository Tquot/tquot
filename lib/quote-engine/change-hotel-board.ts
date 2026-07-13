"use server";

import { getConnectionWithCredentials } from "@/lib/connectors/storage";
import { checkRates } from "@/lib/providers/hotelbeds/check-rates";
import type { BoardCode, BoardOption } from "@/lib/quote-engine/types";
import { normalizeBoardCode } from "@/lib/providers/hotelbeds/board-mapping";

export interface ChangeBoardHotelInput {
  id: string;
  boardCode?: BoardCode;
  boardOptions: BoardOption[];
  /** Precio total estancia actual (coincide con QuoteItem.price). */
  netPrice: number;
  nights: number;
  currency: string;
  connectionId?: string;
}

interface ChangeBoardInput {
  hotelId: string;
  newBoardCode: BoardCode;
  hotel: ChangeBoardHotelInput;
}

export interface ChangeBoardResult {
  success: boolean;
  /** Precio por noche. */
  newNetPrice?: number;
  /** Total estancia (fuente de verdad para la tarjeta). */
  newTotalPrice?: number;
  currency?: string;
  rateKey?: string;
  boardCode?: BoardCode;
  fetchedAt?: string;
  error?: string;
}

/**
 * Valida el rateKey del régimen elegido con checkRates y devuelve precios.
 *
 * Adaptación TQuot: no hay quotes.snapshot jsonb. El cliente aplica el
 * resultado al quote en memoria (mismo patrón que refreshHotelSnapshot).
 */
export async function changeHotelBoard(
  input: ChangeBoardInput,
): Promise<ChangeBoardResult> {
  const hotel = input.hotel;
  const newBoardCode = normalizeBoardCode(input.newBoardCode);
  const currentCode = hotel.boardCode
    ? normalizeBoardCode(hotel.boardCode)
    : undefined;

  if (currentCode && currentCode === newBoardCode) {
    const nights = Math.max(1, hotel.nights);
    return {
      success: true,
      newNetPrice: hotel.netPrice / nights,
      newTotalPrice: hotel.netPrice,
      currency: hotel.currency,
      boardCode: newBoardCode,
    };
  }

  const targetOption = hotel.boardOptions.find(
    (o) => normalizeBoardCode(o.boardCode) === newBoardCode,
  );
  if (!targetOption) {
    return { success: false, error: "board_not_available" };
  }

  if (!hotel.connectionId) {
    return { success: false, error: "hotelbeds_connection_missing" };
  }

  const connection = await getConnectionWithCredentials(hotel.connectionId);
  if (!connection) {
    return { success: false, error: "hotelbeds_connection_not_found" };
  }

  const validation = await checkRates({
    rateKey: targetOption.rateKey,
    credentials: connection.credentials,
  });

  if (!validation.ok) {
    return {
      success: false,
      error: validation.error ?? "rate_check_failed",
    };
  }

  const nights = Math.max(1, hotel.nights);
  const newTotal = validation.netPrice ?? targetOption.totalPrice;
  const newPerNight = newTotal / nights;

  return {
    success: true,
    newNetPrice: newPerNight,
    newTotalPrice: newTotal,
    currency: validation.currency ?? targetOption.currency,
    rateKey: validation.rateKey ?? targetOption.rateKey,
    boardCode: newBoardCode,
    fetchedAt: new Date().toISOString(),
  };
}

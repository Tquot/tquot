"use server";

import { searchHotelbedsExact } from "@/lib/providers/hotelbeds/search-exact";
import { searchBookingByName } from "@/lib/providers/booking/search-by-name";
import type {
  RefreshSnapshotInput,
  RefreshSnapshotResult,
} from "./types";

/**
 * Re-busca el proveedor original y devuelve precios nuevos.
 *
 * Adaptación TQuot: no hay `quotes.snapshot` jsonb. El cliente aplica el
 * resultado al quote en memoria vía `onHotelRefreshed`.
 */
export async function refreshHotelSnapshot(
  input: RefreshSnapshotInput,
): Promise<RefreshSnapshotResult> {
  const { hotel, searchContext } = input;
  const adults =
    searchContext.guests.reduce((sum, g) => sum + g.adults, 0) || 2;
  const children = searchContext.guests.reduce(
    (sum, g) => sum + (g.children ?? 0),
    0,
  );

  try {
    if (hotel.provider === "hotelbeds") {
      const updated = await searchHotelbedsExact({
        hotelName: hotel.name,
        hotelCode: hotel.hotelCode,
        connectionId: hotel.connectionId,
        checkIn: searchContext.checkIn,
        checkOut: searchContext.checkOut,
        adults,
        children,
        destination: searchContext.destination,
      });

      if (!updated) {
        return { success: false, error: "hotel_no_longer_available" };
      }

      return {
        success: true,
        oldPrice: hotel.netPrice,
        newPrice: updated.totalPrice,
        currency: updated.currency,
        rateKey: updated.rateKey,
        fetchedAt: new Date().toISOString(),
      };
    }

    if (hotel.provider === "booking") {
      const updated = await searchBookingByName({
        hotelName: hotel.name,
        hotelCode: hotel.hotelCode,
        checkIn: searchContext.checkIn,
        checkOut: searchContext.checkOut,
        adults,
        children,
        destination: searchContext.destination,
      });

      if (!updated) {
        return { success: false, error: "hotel_no_longer_available" };
      }

      return {
        success: true,
        oldPrice: hotel.netPrice,
        newPrice: updated.totalPrice,
        currency: updated.currency,
        rateKey: updated.rateKey,
        fetchedAt: new Date().toISOString(),
      };
    }

    return { success: false, error: "provider_refresh_not_supported" };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

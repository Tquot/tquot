"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { PriceComparator } from "@/components/quote-canvas/PriceComparator";
import type {
  ComparatorHotelSnapshot,
  ComparatorResponse,
  ProviderKey,
} from "@/lib/comparator/types";
import type { HotelDetails, HotelProvider } from "@/lib/quote-engine/types";

interface Props {
  open: boolean;
  hotel: HotelDetails;
  searchContext: {
    destination: string;
    checkIn: string;
    checkOut: string;
    guests: { adults: number; children?: number }[];
  };
  additionalProviders: HotelProvider[];
  onClose: () => void;
  onHotelRefreshed?: (hotel: HotelDetails) => void;
}

function toSnapshot(hotel: HotelDetails): ComparatorHotelSnapshot {
  return {
    id: hotel.id,
    name: hotel.name,
    provider: hotel.provider as ProviderKey,
    netPrice: hotel.netPrice,
    currency: hotel.currency,
    fetchedAt: hotel.fetchedAt,
    hotelCode: hotel.hotelCode,
    rateKey: hotel.rateKey,
    connectionId: hotel.connectionId,
  };
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  const diff = Math.max(0, end - start);
  return Math.max(1, Math.round(diff / 86_400_000));
}

function loadingResponse(hotel: HotelDetails, nights: number): ComparatorResponse {
  const fetchedAt = hotel.fetchedAt || new Date().toISOString();
  const ageMinutes = Math.max(
    0,
    Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60_000),
  );
  return {
    hotelName: hotel.name,
    generatedAt: new Date().toISOString(),
    entries: [
      {
        provider: hotel.provider as ProviderKey,
        source: "snapshot",
        available: true,
        pricePerNight: Math.round(hotel.netPrice / nights),
        totalPrice: hotel.netPrice,
        currency: hotel.currency,
        nights,
        hotelName: hotel.name,
        fetchedAt,
        ageMinutes,
        rateKey: hotel.rateKey,
      },
    ],
  };
}

export function HotelCompareModal({
  open,
  hotel,
  searchContext,
  additionalProviders,
  onClose,
  onHotelRefreshed,
}: Props) {
  const nights = useMemo(
    () => nightsBetween(searchContext.checkIn, searchContext.checkOut),
    [searchContext.checkIn, searchContext.checkOut],
  );

  const [currentHotel, setCurrentHotel] = useState(hotel);
  const [comparison, setComparison] = useState<ComparatorResponse>(() =>
    loadingResponse(hotel, nights),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentHotel(hotel);
    setComparison(loadingResponse(hotel, nights));
  }, [hotel, nights]);

  const loadComparison = useCallback(
    async (hotelSnapshot: HotelDetails, signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/hotels/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hotel: {
              ...toSnapshot(hotelSnapshot),
              nights,
            },
            ...searchContext,
            excludeProvider: hotelSnapshot.provider,
            additionalProviders,
          }),
          signal,
        });
        const data = (await response.json()) as ComparatorResponse & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "compare_failed");
        }
        setComparison(data);
        return data;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return loadingResponse(hotelSnapshot, nights);
        }
        const message = err instanceof Error ? err.message : "unknown";
        setError(message);
        const fallback = loadingResponse(hotelSnapshot, nights);
        setComparison(fallback);
        return fallback;
      } finally {
        setLoading(false);
      }
    },
    [additionalProviders, nights, searchContext],
  );

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void loadComparison(hotel, controller.signal);
    return () => controller.abort();
  }, [open, hotel, loadComparison]);

  return (
    <Modal open={open} onClose={onClose} title={currentHotel.name} size="lg">
      {loading && comparison.entries.length <= 1 ? (
        <p className="mb-3 text-xs text-neutral-500">
          Consultando proveedores…
        </p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Comparación parcial: {error}
        </p>
      ) : null}

      <PriceComparator
        key={`${currentHotel.id}-${currentHotel.fetchedAt}-${currentHotel.netPrice}`}
        hotel={toSnapshot(currentHotel)}
        searchContext={searchContext}
        initial={comparison}
        onSnapshotRefreshed={(update) => {
          const updated: HotelDetails = { ...currentHotel, ...update };
          setCurrentHotel(updated);
          onHotelRefreshed?.(updated);
        }}
        onReloadComparison={async (updatedHotel) => {
          const asDetails: HotelDetails = {
            ...currentHotel,
            netPrice: updatedHotel.netPrice,
            currency: updatedHotel.currency,
            rateKey: updatedHotel.rateKey,
            fetchedAt: updatedHotel.fetchedAt,
          };
          setCurrentHotel(asDetails);
          return loadComparison(asDetails);
        }}
      />

      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold"
      >
        Cerrar
      </button>
    </Modal>
  );
}

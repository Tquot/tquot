"use client";

import { useEffect, useState, useTransition } from "react";
import { refreshHotelPrice } from "@/app/actions/quotes";
import { Modal } from "@/components/ui/Modal";
import type {
  HotelDetails,
  HotelPriceQuote,
  HotelProvider,
} from "@/lib/quote-engine/types";

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

const STALE_AFTER_MS = 30 * 60 * 1000;

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h`;
}

function SkeletonRow() {
  return (
    <tr>
      <td colSpan={3} className="py-2 text-xs text-neutral-400">
        Consultando proveedores…
      </td>
    </tr>
  );
}

function ComparisonTable({
  prices,
  errors,
  loading,
  snapshotProvider,
  onRefreshSnapshot,
  refreshing,
}: {
  prices: HotelPriceQuote[];
  errors: { provider: HotelProvider; message: string }[];
  loading: boolean;
  snapshotProvider: HotelProvider;
  onRefreshSnapshot?: () => void;
  refreshing: boolean;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">Comparativa de precios</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-neutral-500">
            <th>Proveedor</th>
            <th>Precio</th>
            <th>Fuente</th>
          </tr>
        </thead>
        <tbody>
          {prices.map((price) => (
            <tr
              key={price.provider}
              className={
                price.provider === snapshotProvider ? "bg-amber-50" : ""
              }
            >
              <td className="py-2 capitalize">{price.provider}</td>
              <td className="py-2 font-medium">
                {price.netPrice.toFixed(2)} {price.currency}
              </td>
              <td className="py-2 text-xs text-neutral-600">
                {price.source === "snapshot"
                  ? `Precio de la cotización · ${formatTimeAgo(price.fetchedAt)}`
                  : "En vivo · ahora"}
                {price.stale ? (
                  <span className="ml-2 text-amber-700">desactualizado</span>
                ) : null}
              </td>
            </tr>
          ))}
          {loading ? <SkeletonRow /> : null}
        </tbody>
      </table>

      {onRefreshSnapshot ? (
        <button
          type="button"
          onClick={onRefreshSnapshot}
          disabled={refreshing}
          className="mt-3 text-xs font-semibold text-blue-600 underline disabled:opacity-50"
        >
          {refreshing
            ? "Refrescando…"
            : `Refrescar ${snapshotProvider}`}
        </button>
      ) : null}

      {errors.length > 0 ? (
        <div className="mt-3 text-xs text-neutral-500">
          {errors.map((error) => (
            <div key={error.provider}>
              {error.provider}: no disponible ({error.message})
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function HotelCompareModal({
  open,
  hotel,
  searchContext,
  additionalProviders,
  onClose,
  onHotelRefreshed,
}: Props) {
  const [livePrices, setLivePrices] = useState<HotelPriceQuote[]>([]);
  const [errors, setErrors] = useState<
    { provider: HotelProvider; message: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [currentHotel, setCurrentHotel] = useState(hotel);

  useEffect(() => {
    setCurrentHotel(hotel);
  }, [hotel]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const targets = additionalProviders.filter(
      (provider) => provider !== currentHotel.provider,
    );
    if (targets.length === 0) {
      setLivePrices([]);
      setErrors([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch("/api/hotels/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelName: currentHotel.name,
        ...searchContext,
        excludeProvider: currentHotel.provider,
        additionalProviders: targets,
      }),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then(
        (data: {
          prices: HotelPriceQuote[];
          errors: { provider: HotelProvider; message: string }[];
        }) => {
          setLivePrices(data.prices ?? []);
          setErrors(data.errors ?? []);
        },
      )
      .catch((err) => {
        if (err.name === "AbortError") return;
        setErrors([{ provider: targets[0], message: err.message }]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [
    open,
    currentHotel.provider,
    currentHotel.name,
    searchContext,
    additionalProviders,
  ]);

  const snapshotRow: HotelPriceQuote = {
    provider: currentHotel.provider,
    netPrice: currentHotel.netPrice,
    currency: currentHotel.currency,
    rateKey: currentHotel.rateKey,
    fetchedAt: currentHotel.fetchedAt,
    source: "snapshot",
    stale:
      Date.now() - new Date(currentHotel.fetchedAt).getTime() > STALE_AFTER_MS,
  };

  const allPrices = [snapshotRow, ...livePrices].sort(
    (a, b) => a.netPrice - b.netPrice,
  );

  function handleRefreshSnapshot() {
    startRefresh(async () => {
      try {
        const refreshed = await refreshHotelPrice({
          hotel: currentHotel,
          searchContext,
        });
        const updated: HotelDetails = { ...currentHotel, ...refreshed };
        setCurrentHotel(updated);
        onHotelRefreshed?.(updated);
      } catch (err) {
        setErrors((prev) => [
          ...prev,
          {
            provider: currentHotel.provider,
            message: err instanceof Error ? err.message : "unknown",
          },
        ]);
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={currentHotel.name} size="lg">
      <ComparisonTable
        prices={allPrices}
        errors={errors}
        loading={loading}
        snapshotProvider={currentHotel.provider}
        onRefreshSnapshot={handleRefreshSnapshot}
        refreshing={refreshing}
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

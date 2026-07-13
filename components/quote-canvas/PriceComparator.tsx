"use client";

import { useEffect, useState, useTransition } from "react";
import { ComparatorSourceBadge } from "@/components/quote-canvas/ComparatorSourceBadge";
import { refreshHotelSnapshot } from "@/lib/comparator/refresh-snapshot";
import type {
  ComparatorEntry,
  ComparatorHotelSnapshot,
  ComparatorResponse,
  ComparatorSearchContext,
} from "@/lib/comparator/types";

interface Props {
  hotel: ComparatorHotelSnapshot;
  searchContext: ComparatorSearchContext;
  initial: ComparatorResponse;
  onSnapshotRefreshed?: (update: {
    netPrice: number;
    currency: string;
    rateKey?: string;
    fetchedAt: string;
  }) => void;
  onReloadComparison?: (
    hotel: ComparatorHotelSnapshot,
  ) => Promise<ComparatorResponse>;
}

export function PriceComparator({
  hotel,
  searchContext,
  initial,
  onSnapshotRefreshed,
  onReloadComparison,
}: Props) {
  const [data, setData] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [refreshResult, setRefreshResult] = useState<string | null>(null);

  useEffect(() => {
    setData(initial);
  }, [initial]);

  const snapshotEntry = data.entries.find((e) => e.source === "snapshot");
  const staleBanner =
    snapshotEntry && snapshotEntry.ageMinutes > 30
      ? `Tarifa cotizada hace ${snapshotEntry.ageMinutes} min`
      : null;

  const handleRefresh = () => {
    startTransition(async () => {
      const result = await refreshHotelSnapshot({ hotel, searchContext });
      if (result.success && result.newPrice != null) {
        setRefreshResult(
          `Actualizado: ${result.oldPrice} → ${result.newPrice} ${result.currency}`,
        );
        const fetchedAt = result.fetchedAt ?? new Date().toISOString();
        const updatedHotel: ComparatorHotelSnapshot = {
          ...hotel,
          netPrice: result.newPrice,
          currency: result.currency ?? hotel.currency,
          rateKey: result.rateKey ?? hotel.rateKey,
          fetchedAt,
        };
        onSnapshotRefreshed?.({
          netPrice: result.newPrice,
          currency: result.currency ?? hotel.currency,
          rateKey: result.rateKey,
          fetchedAt,
        });
        if (onReloadComparison) {
          try {
            const updated = await onReloadComparison(updatedHotel);
            setData(updated);
          } catch {
            setData((prev) => ({
              ...prev,
              entries: prev.entries.map((entry) =>
                entry.source === "snapshot"
                  ? {
                      ...entry,
                      totalPrice: result.newPrice,
                      pricePerNight:
                        entry.nights > 0
                          ? Math.round((result.newPrice ?? 0) / entry.nights)
                          : result.newPrice,
                      currency: result.currency ?? entry.currency,
                      fetchedAt,
                      ageMinutes: 0,
                      rateKey: result.rateKey ?? entry.rateKey,
                    }
                  : entry,
              ),
              generatedAt: new Date().toISOString(),
            }));
          }
        } else {
          setData((prev) => ({
            ...prev,
            entries: prev.entries.map((entry) =>
              entry.source === "snapshot"
                ? {
                    ...entry,
                    totalPrice: result.newPrice,
                    pricePerNight:
                      entry.nights > 0
                        ? Math.round((result.newPrice ?? 0) / entry.nights)
                        : result.newPrice,
                    currency: result.currency ?? entry.currency,
                    fetchedAt,
                    ageMinutes: 0,
                    rateKey: result.rateKey ?? entry.rateKey,
                  }
                : entry,
            ),
            generatedAt: new Date().toISOString(),
          }));
        }
      } else {
        setRefreshResult(`Error: ${result.error ?? "unknown"}`);
      }
      window.setTimeout(() => setRefreshResult(null), 4000);
    });
  };

  const sorted = [...data.entries].sort((a, b) => {
    if (a.totalPrice == null) return 1;
    if (b.totalPrice == null) return -1;
    return a.totalPrice - b.totalPrice;
  });

  const cheapest = sorted.find((e) => e.available)?.totalPrice;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Comparador de precios</h3>
          <p className="text-xs text-neutral-600">{data.hotelName}</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={pending}
          className="rounded-md bg-neutral-100 px-3 py-1 text-xs font-medium hover:bg-neutral-200 disabled:opacity-50"
        >
          {pending ? "Refrescando…" : "Refrescar precio"}
        </button>
      </header>

      {staleBanner ? (
        <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {staleBanner}
        </div>
      ) : null}

      {refreshResult ? (
        <div className="mb-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          {refreshResult}
        </div>
      ) : null}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
            <th className="pb-2 font-medium">Proveedor</th>
            <th className="pb-2 font-medium">Origen</th>
            <th className="pb-2 font-medium text-right">Por noche</th>
            <th className="pb-2 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, idx) => (
            <ComparatorRow
              key={`${entry.provider}_${idx}`}
              entry={entry}
              isCheapest={cheapest != null && entry.totalPrice === cheapest}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ComparatorRow({
  entry,
  isCheapest,
}: {
  entry: ComparatorEntry;
  isCheapest: boolean;
}) {
  if (!entry.available) {
    return (
      <tr className="border-b border-neutral-100">
        <td className="py-2 font-medium capitalize">{entry.provider}</td>
        <td className="py-2">
          <ComparatorSourceBadge entry={entry} />
        </td>
        <td colSpan={2} className="py-2 text-right text-xs text-neutral-500">
          {entry.error === "not_found"
            ? "No encontrado"
            : (entry.error ?? "No disponible")}
        </td>
      </tr>
    );
  }

  return (
    <tr
      className={`border-b border-neutral-100 ${isCheapest ? "bg-emerald-50" : ""}`}
    >
      <td className="py-2 font-medium capitalize">{entry.provider}</td>
      <td className="py-2">
        <ComparatorSourceBadge entry={entry} />
      </td>
      <td className="py-2 text-right">
        {entry.pricePerNight} {entry.currency}
      </td>
      <td className="py-2 text-right font-semibold">
        {entry.totalPrice} {entry.currency}
        {isCheapest ? (
          <span className="ml-1 text-emerald-700">★</span>
        ) : null}
      </td>
    </tr>
  );
}

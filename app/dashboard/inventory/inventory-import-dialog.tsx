"use client";

import { useState } from "react";
import { useDashboardLanguage } from "../dashboard-language-provider";
import { formatMessage } from "../format-message";
import {
  createInventoryItemsBatch,
  type InventoryCategory,
} from "./actions";
import type { ImportParseResponse } from "@/lib/inventory/types";

type InventoryImportDialogProps = {
  open: boolean;
  fileName: string;
  parseResult: ImportParseResponse | null;
  onClose: () => void;
  onImported: () => void;
};

const BATCH_CHUNK_SIZE = 500;

function chunkRows<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

const categoryLabels: Record<InventoryCategory, { es: string; en: string }> = {
  hotels: { es: "Hoteles", en: "Hotels" },
  experiences: { es: "Experiencias", en: "Experiences" },
  suppliers: { es: "Proveedores", en: "Suppliers" },
  tour_operators: { es: "Tour operadores", en: "Tour operators" },
};

export function InventoryImportDialog({
  open,
  fileName,
  parseResult,
  onClose,
  onImported,
}: InventoryImportDialogProps) {
  const { locale, t } = useDashboardLanguage();
  const [isConfirming, setIsConfirming] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState("");

  if (!open || !parseResult) return null;

  const { mappedRows, unmappedColumns, preview, stats } = parseResult;

  async function handleConfirm() {
    setIsConfirming(true);
    setError("");
    setBatchProgress(null);

    const payload = mappedRows.map((row) => ({
      category: row.category,
      name: row.name,
      data: row.data,
    }));
    const chunks = chunkRows(payload, BATCH_CHUNK_SIZE);

    for (let index = 0; index < chunks.length; index++) {
      setBatchProgress({ current: index + 1, total: chunks.length });

      const result = await createInventoryItemsBatch(chunks[index]);

      if (result.error) {
        setError(result.error);
        setIsConfirming(false);
        setBatchProgress(null);
        return;
      }
    }

    setIsConfirming(false);
    setBatchProgress(null);
    onImported();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-import-title"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#091220] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              id="inventory-import-title"
              className="text-xl font-bold text-white"
            >
              {t.inventoryImportTitle}
            </h2>
            <p className="mt-1 text-sm text-[#8B9CB3]">{fileName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-[#8B9CB3] hover:text-white"
          >
            {t.inventoryImportCancel}
          </button>
        </div>

        <p className="mb-4 text-sm text-[#E8EEF7]">
          {formatMessage(t.inventoryImportSummary, {
            mapped: String(mappedRows.length),
            skipped: String(stats.skipped),
            total: String(stats.total),
          })}
        </p>

        {unmappedColumns.length > 0 ? (
          <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            <p className="font-semibold">{t.inventoryImportUnmapped}</p>
            <p className="mt-1 text-amber-100/90">{unmappedColumns.join(", ")}</p>
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-[#FF6B35]/30 bg-[#FF6B35]/10 px-4 py-3 text-sm text-[#FF6B35]">
            {error}
          </div>
        ) : null}

        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#00C9A7]">
          {t.inventoryImportPreview}
        </p>

        <div className="mb-6 overflow-hidden rounded-xl border border-white/[0.06]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-white/[0.04] text-[#8B9CB3]">
              <tr>
                <th className="px-3 py-2">{t.inventoryNameLabel}</th>
                <th className="px-3 py-2">{t.inventoryImportCategory}</th>
                <th className="px-3 py-2">{t.inventoryImportDetails}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {preview.length > 0 ? (
                preview.map((row, index) => (
                  <tr key={`${row.name}-${index}`} className="bg-[#03080F]/40">
                    <td className="px-3 py-3 font-medium text-white">
                      {row.name}
                    </td>
                    <td className="px-3 py-3 text-[#8B9CB3]">
                      {locale === "es"
                        ? categoryLabels[row.category].es
                        : categoryLabels[row.category].en}
                    </td>
                    <td className="px-3 py-3 text-[#8B9CB3]">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(row.data).map(([key, value]) =>
                          value ? (
                            <span
                              key={key}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs"
                            >
                              {key}: {value}
                            </span>
                          ) : null,
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-6 text-center text-[#8B9CB3]"
                  >
                    {t.inventoryImportNoRows}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-[#8B9CB3] hover:text-white"
          >
            {t.inventoryImportCancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming || mappedRows.length === 0}
            className="rounded-xl bg-[#00C9A7] px-5 py-2.5 text-sm font-semibold text-[#03080F] transition-colors hover:bg-[#00E5BB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConfirming && batchProgress
              ? formatMessage(t.inventoryImportBatchProgress, {
                  current: String(batchProgress.current),
                  total: String(batchProgress.total),
                })
              : isConfirming
                ? t.inventoryImportConfirming
                : formatMessage(t.inventoryImportConfirm, {
                    count: String(mappedRows.length),
                  })}
          </button>
        </div>
      </div>
    </div>
  );
}

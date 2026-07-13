"use client";

import { useEffect, useState } from "react";
import { restoreVersion } from "@/lib/versioning/restore-version";
import type { ChangeKind, QuoteVersion } from "@/lib/versioning/types";

interface Props {
  quoteId: string;
  onClose: () => void;
}

export function VersionHistoryModal({ quoteId, onClose }: Props) {
  const [versions, setVersions] = useState<QuoteVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/quotes/${quoteId}/versions`)
      .then((r) => r.json())
      .then((data: { versions?: QuoteVersion[] }) => {
        setVersions(data.versions ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [quoteId]);

  const handleRestore = async (versionNumber: number) => {
    if (
      !confirm(
        `¿Restaurar a la versión ${versionNumber}? Se guardará el estado actual como nueva versión.`,
      )
    ) {
      return;
    }

    setRestoring(versionNumber);
    const result = await restoreVersion({ quoteId, versionNumber });
    setRestoring(null);
    if (result.success) {
      onClose();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <h2 className="text-base font-semibold">Historial de cambios</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            ✕
          </button>
        </header>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {loading ? (
            <div className="text-sm text-neutral-500">Cargando…</div>
          ) : versions.length === 0 ? (
            <div className="text-sm text-neutral-500">Sin versiones previas.</div>
          ) : (
            <ol className="space-y-3">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="rounded-md border border-neutral-200 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">
                        Versión {v.versionNumber} · {kindLabel(v.changeKind)}
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-600">
                        {v.changeSummary ?? "—"}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {new Date(v.createdAt).toLocaleString("es-ES")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRestore(v.versionNumber)}
                      disabled={restoring === v.versionNumber}
                      className="shrink-0 text-xs text-blue-600 hover:underline disabled:opacity-50"
                    >
                      {restoring === v.versionNumber
                        ? "Restaurando…"
                        : "Restaurar"}
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function kindLabel(kind: ChangeKind | string): string {
  return (
    (
      {
        initial: "Versión inicial",
        refinement: "Refinamiento",
        manual_edit: "Edición manual",
        board_change: "Cambio de régimen",
        snapshot_refresh: "Refresco de precio",
      } as Record<string, string>
    )[kind] ?? kind
  );
}

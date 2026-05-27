"use client";

import type {
  AgencyConnectionRow,
  ProviderCatalogRow,
} from "@/lib/connectors/storage";

interface Props {
  provider: ProviderCatalogRow & { is_implemented_real: boolean };
  connection?: AgencyConnectionRow;
  onClick: () => void;
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: "Sin probar", className: "bg-neutral-100 text-neutral-700" },
  active: { label: "Conectado", className: "bg-emerald-100 text-emerald-800" },
  error: { label: "Error", className: "bg-red-100 text-red-800" },
  disabled: { label: "Desactivado", className: "bg-neutral-100 text-neutral-500" },
};

export function ConnectorCard({ provider, connection, onClick }: Props) {
  const isStub = !provider.is_implemented_real;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isStub}
      className={`group relative flex flex-col rounded-lg border bg-white p-5 text-left transition ${
        isStub
          ? "cursor-not-allowed border-neutral-200 opacity-60"
          : "border-neutral-200 hover:border-neutral-400 hover:shadow-sm"
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          {provider.logo_url ? (
            <img
              src={provider.logo_url}
              alt={provider.name}
              className="h-10 w-10 rounded object-contain"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-neutral-100 font-mono text-xs font-semibold text-neutral-600">
              {provider.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium text-neutral-900">{provider.name}</div>
            <div className="text-xs text-neutral-500">
              {provider.category}
            </div>
          </div>
        </div>

        {connection && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              STATUS_BADGES[connection.status]?.className ?? ""
            }`}
          >
            {STATUS_BADGES[connection.status]?.label ?? connection.status}
          </span>
        )}
      </div>

      {provider.description && (
        <p className="mb-4 text-xs leading-relaxed text-neutral-600">
          {provider.description}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between">
        {isStub ? (
          <span className="text-xs italic text-neutral-500">
            Próximamente
          </span>
        ) : connection ? (
          <span className="text-xs font-medium text-neutral-700 group-hover:text-neutral-900">
            Gestionar →
          </span>
        ) : (
          <span className="text-xs font-medium text-neutral-700 group-hover:text-neutral-900">
            Conectar →
          </span>
        )}

        {connection?.last_test_at && (
          <span className="text-[10px] text-neutral-400">
            Probada {new Date(connection.last_test_at).toLocaleDateString("es-ES")}
          </span>
        )}
      </div>
    </button>
  );
}

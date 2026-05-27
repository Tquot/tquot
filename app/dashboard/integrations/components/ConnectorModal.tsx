"use client";

import { useEffect, useState } from "react";
import type {
  AgencyConnectionRow,
  ProviderCatalogRow,
} from "@/lib/connectors/storage";

interface Props {
  provider: ProviderCatalogRow;
  existingConnection?: AgencyConnectionRow;
  onSaved?: () => void;
  onDeleted?: () => void;
  onClose: () => void;
}

type ConfigField = ProviderCatalogRow["config_schema"]["fields"][number];

const STATUS_LABELS: Record<
  string,
  { label: string; className: string }
> = {
  pending: { label: "Sin probar", className: "bg-neutral-100 text-neutral-700" },
  active: { label: "Conectado", className: "bg-emerald-100 text-emerald-800" },
  error: { label: "Error", className: "bg-red-100 text-red-800" },
  disabled: {
    label: "Desactivado",
    className: "bg-neutral-100 text-neutral-500",
  },
};

function buildFieldValues(
  fields: ConfigField[],
  existingConnection?: AgencyConnectionRow
): Record<string, string> {
  const config = (existingConnection?.config ?? {}) as Record<string, unknown>;
  const initial: Record<string, string> = {};
  for (const field of fields) {
    const configVal = config[field.key];
    if (typeof configVal === "string") {
      initial[field.key] = configVal;
    } else if (typeof configVal === "number" || typeof configVal === "boolean") {
      initial[field.key] = String(configVal);
    } else {
      initial[field.key] = field.default ?? "";
    }
  }
  return initial;
}

export function ConnectorModal({
  provider,
  existingConnection,
  onSaved,
  onDeleted,
  onClose,
}: Props) {
  const fields = provider.config_schema.fields ?? [];

  const [values, setValues] = useState<Record<string, string>>(() =>
    buildFieldValues(fields, existingConnection)
  );

  const [displayName, setDisplayName] = useState(
    existingConnection?.display_name ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  useEffect(() => {
    const schemaFields = provider.config_schema.fields ?? [];
    setDisplayName(existingConnection?.display_name ?? "");
    setValues(buildFieldValues(schemaFields, existingConnection));
    setFeedback(null);
  }, [existingConnection, provider.id, provider.config_schema]);

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/connectors/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: provider.id,
          credentials: values,
          displayName: displayName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          message: data.error ?? "Error guardando",
        });
        return;
      }
      onClose();
      await onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    const connectionId = existingConnection?.id;
    if (!connectionId) {
      setFeedback({
        type: "info",
        message: "Guarda primero las credenciales y luego prueba.",
      });
      return;
    }
    setTesting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/connectors/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          message: data.error ?? "Error desconocido",
        });
        return;
      }
      if (data.ok) {
        setFeedback({
          type: "success",
          message: `Conexión OK (${data.elapsedMs}ms). ${data.message ?? ""}`,
        });
      } else {
        setFeedback({
          type: "error",
          message: data.error ?? "Error desconocido",
        });
      }
    } finally {
      setTesting(false);
    }
  }

  async function handleDelete() {
    if (!existingConnection) return;
    if (!confirm("¿Borrar esta conexión? Las credenciales se eliminarán."))
      return;
    const res = await fetch(`/api/connectors/connections/${existingConnection.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await onDeleted?.();
      onClose();
    }
  }

  const statusBadge = existingConnection
    ? STATUS_LABELS[existingConnection.status]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-neutral-900">
                {provider.name}
              </h3>
              {statusBadge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500">{provider.description}</p>
            {existingConnection?.last_test_error && (
              <p className="mt-1 text-xs text-red-600">
                Último error: {existingConnection.last_test_error}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700">
              Nombre interno (opcional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={`${provider.name} principal`}
              autoComplete="off"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>

          {fields.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-xs font-medium text-neutral-700">
                {field.label}
                {field.required && <span className="text-red-500"> *</span>}
              </label>
              {field.type === "select" ? (
                <select
                  value={values[field.key] ?? ""}
                  onChange={(e) =>
                    setValues({ ...values, [field.key]: e.target.value })
                  }
                  autoComplete="off"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                >
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === "password" ? "password" : "text"}
                  value={values[field.key] ?? ""}
                  onChange={(e) =>
                    setValues({ ...values, [field.key]: e.target.value })
                  }
                  placeholder={
                    existingConnection && field.type === "password"
                      ? "Dejar vacío para mantener las actuales"
                      : undefined
                  }
                  autoComplete={
                    field.type === "password" ? "new-password" : "off"
                  }
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm focus:border-neutral-900 focus:outline-none"
                />
              )}
            </div>
          ))}

          {feedback && (
            <div
              className={`rounded-md p-3 text-sm ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800"
                  : feedback.type === "error"
                  ? "bg-red-50 text-red-800"
                  : "bg-blue-50 text-blue-800"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {provider.docs_url && (
            <p className="text-xs text-neutral-500">
              ¿No sabes dónde encontrar estas credenciales?{" "}
              <a
                href={provider.docs_url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-neutral-900 underline"
              >
                Ver documentación oficial
              </a>
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-4">
          {existingConnection ? (
            <button
              onClick={handleDelete}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Borrar conexión
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={testing || !existingConnection?.id}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {testing ? "Probando…" : "Probar conexión"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

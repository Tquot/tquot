"use client";

import { useState, useTransition } from "react";

type ActionResult = { ok: true } | { ok: false; error: string };

interface Props {
  baseCurrency: string;
  currencies: string[];
  action: (formData: FormData) => Promise<ActionResult>;
}

export function CurrencySettingsForm({
  baseCurrency,
  currencies,
  action,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5"
      action={(formData) => {
        setMessage(null);
        setError(null);
        startTransition(async () => {
          const result = await action(formData);
          if (result.ok) {
            setMessage("Moneda base guardada.");
          } else {
            setError(result.error);
          }
        });
      }}
    >
      <label className="block text-sm">
        <span className="font-medium text-neutral-700">
          Moneda base de la agencia
        </span>
        <select
          name="base_currency"
          defaultValue={baseCurrency}
          className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-neutral-500">
          Todas las cotizaciones se muestran en esta moneda. Los precios
          originales quedan registrados en el detalle (tooltip ⓘ).
        </p>
      </label>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Tipo de cambio orientativo. El proveedor puede cobrar en su moneda
        original hasta la reserva.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>

      {message ? (
        <p className="text-sm text-teal-700">{message}</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}

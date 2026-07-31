"use client";

import { useState } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { BrandColorPicker } from "./BrandColorPicker";

interface Props {
  initialName?: string;
  initialPrimary?: string;
  initialAccent?: string;
  initialAccessibilityDefault?: boolean;
  onSubmit: (data: {
    name: string;
    primaryColor: string;
    accentColor: string;
    accessibilityDefault: boolean;
  }) => Promise<void>;
}

export function AgencyForm({
  initialName = "",
  initialPrimary = "#1B2436",
  initialAccent = "#B89446",
  initialAccessibilityDefault = false,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialName);
  const [primary, setPrimary] = useState(initialPrimary);
  const [accent, setAccent] = useState(initialAccent);
  const [accessibilityDefault, setAccessibilityDefault] = useState(
    initialAccessibilityDefault,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre de la agencia es obligatorio.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        primaryColor: primary,
        accentColor: accent,
        accessibilityDefault,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-8">
      <div>
        <Eyebrow className="mb-4 block">Paso 02 · Identidad</Eyebrow>
        <h1
          className="font-serif text-h1 text-ink"
          style={{ fontWeight: 500 }}
        >
          Cómo se ve tu agencia en el PDF.
        </h1>
        <p className="mt-3 text-body text-text-2">
          El color por defecto es ink — el PDF debe verse como tuyo, no como
          TQuot.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-body-sm font-medium text-ink">
          Nombre de la agencia
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 w-full rounded-md border border-border-1 bg-paper px-4 text-body text-ink outline-none focus:border-border-3"
          placeholder="Viajes Horizonte"
          required
        />
      </label>

      <div>
        <Eyebrow className="mb-3 block">Color de marca</Eyebrow>
        <BrandColorPicker
          primary={primary}
          onChange={(p, a) => {
            setPrimary(p);
            setAccent(a);
          }}
        />
      </div>

      <details className="rounded-lg border border-border-1 bg-paper-2 p-4">
        <summary className="cursor-pointer text-body-sm font-medium text-ink">
          Opciones adicionales
        </summary>
        <div className="mt-4">
          <Eyebrow className="mb-3 block">Accesibilidad · opcional</Eyebrow>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={accessibilityDefault}
              onChange={(e) => setAccessibilityDefault(e.target.checked)}
              className="mt-1"
            />
            <span className="text-body-sm leading-relaxed text-text">
              Mostrar por defecto información de accesibilidad verificada en
              cada cotización. Recomendado si tu agencia trabaja con clientes
              con necesidades de accesibilidad.
            </span>
          </label>
        </div>
      </details>

      {error ? <p className="text-body-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center rounded-md bg-ink px-6 text-body font-medium text-paper transition-colors hover:bg-ink-2 disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Continuar"}
      </button>
    </form>
  );
}

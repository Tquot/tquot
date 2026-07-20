"use client";

import { useState, useTransition } from "react";
import type { AgencyBranding } from "@/lib/branding/types";

interface Props {
  initial: AgencyBranding;
  action: (patch: Partial<Omit<AgencyBranding, "agencyId">>) => Promise<void>;
}

const FONT_OPTIONS = ["Helvetica", "Times-Roman", "Courier"];

export function BrandingForm({ initial, action }: Props) {
  const [form, setForm] = useState({
    primaryColor: initial.primaryColor,
    secondaryColor: initial.secondaryColor,
    textColor: initial.textColor,
    accentColor: initial.accentColor,
    fontFamily: initial.fontFamily,
    logoUrl: initial.logoUrl ?? "",
    coverImageUrl: initial.coverImageUrl ?? "",
    agencyLegalName: initial.agencyLegalName ?? "",
    agencyPhone: initial.agencyPhone ?? "",
    agencyEmail: initial.agencyEmail ?? "",
    agencyWebsite: initial.agencyWebsite ?? "",
    agencyAddress: initial.agencyAddress ?? "",
    pdfFooterText: initial.pdfFooterText ?? "",
  });
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = () => {
    startTransition(async () => {
      await action({
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        textColor: form.textColor,
        accentColor: form.accentColor,
        fontFamily: form.fontFamily,
        logoUrl: form.logoUrl || undefined,
        coverImageUrl: form.coverImageUrl || undefined,
        agencyLegalName: form.agencyLegalName || undefined,
        agencyPhone: form.agencyPhone || undefined,
        agencyEmail: form.agencyEmail || undefined,
        agencyWebsite: form.agencyWebsite || undefined,
        agencyAddress: form.agencyAddress || undefined,
        pdfFooterText: form.pdfFooterText || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold">Colores</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField
            label="Primario"
            value={form.primaryColor}
            onChange={(v) => update("primaryColor", v)}
          />
          <ColorField
            label="Secundario"
            value={form.secondaryColor}
            onChange={(v) => update("secondaryColor", v)}
          />
          <ColorField
            label="Texto"
            value={form.textColor}
            onChange={(v) => update("textColor", v)}
          />
          <ColorField
            label="Acento"
            value={form.accentColor}
            onChange={(v) => update("accentColor", v)}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Tipografía e imágenes</h2>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-600">Fuente PDF</span>
            <select
              value={form.fontFamily}
              onChange={(e) => update("fontFamily", e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label="URL del logo"
            value={form.logoUrl}
            onChange={(v) => update("logoUrl", v)}
            placeholder="https://..."
          />
          <TextField
            label="URL imagen de portada"
            value={form.coverImageUrl}
            onChange={(v) => update("coverImageUrl", v)}
            placeholder="https://..."
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Datos de la agencia en PDF</h2>
        <div className="space-y-3">
          <TextField
            label="Nombre legal"
            value={form.agencyLegalName}
            onChange={(v) => update("agencyLegalName", v)}
          />
          <TextField
            label="Teléfono"
            value={form.agencyPhone}
            onChange={(v) => update("agencyPhone", v)}
          />
          <TextField
            label="Email"
            value={form.agencyEmail}
            onChange={(v) => update("agencyEmail", v)}
            type="email"
          />
          <TextField
            label="Web"
            value={form.agencyWebsite}
            onChange={(v) => update("agencyWebsite", v)}
            type="url"
          />
          <TextField
            label="Dirección"
            value={form.agencyAddress}
            onChange={(v) => update("agencyAddress", v)}
          />
          <TextField
            label="Texto del pie de página"
            value={form.pdfFooterText}
            onChange={(v) => update("pdfFooterText", v)}
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        {saved ? (
          <span className="text-sm text-emerald-600">✓ Guardado</span>
        ) : null}
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded border border-neutral-300"
      />
      <span className="flex-1">
        <span className="block text-xs text-neutral-600">{label}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-0.5 w-full rounded-md border border-neutral-300 px-2 py-1 font-mono text-xs"
        />
      </span>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-neutral-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      />
    </label>
  );
}

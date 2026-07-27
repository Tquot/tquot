"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

interface Props {
  initial: {
    search?: string;
    destination?: string;
    tier?: string;
    year?: string;
  };
}

const inputClass =
  "w-full rounded-xl border border-tquot-border bg-tquot-surface px-3 py-2 text-sm text-tquot-text outline-none transition-colors focus:border-tquot-accent focus:ring-2 focus:ring-tquot-accent/20";

export function ClientFilters({ initial }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set(key, value.trim());
      else params.delete(key);
      startTransition(() => {
        router.push(`/dashboard/clients?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const params = new URLSearchParams();
        for (const key of ["search", "destination", "tier", "year"] as const) {
          const value = String(form.get(key) ?? "").trim();
          if (value) params.set(key, value);
        }
        startTransition(() => {
          router.push(`/dashboard/clients?${params.toString()}`);
        });
      }}
    >
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tquot-muted">
          Buscar
        </span>
        <input
          name="search"
          type="search"
          defaultValue={initial.search ?? ""}
          placeholder="Nombre o email"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tquot-muted">
          Destino
        </span>
        <input
          name="destination"
          type="text"
          defaultValue={initial.destination ?? ""}
          placeholder="Ej. Roma"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tquot-muted">
          Tier hotel
        </span>
        <select
          name="tier"
          defaultValue={initial.tier ?? ""}
          className={inputClass}
          onChange={(event) => update("tier", event.target.value)}
        >
          <option value="">Todos</option>
          <option value="budget">budget</option>
          <option value="mid">mid</option>
          <option value="premium">premium</option>
          <option value="luxury">luxury</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-tquot-muted">
          Año
        </span>
        <select
          name="year"
          defaultValue={initial.year ?? ""}
          className={inputClass}
          onChange={(event) => update("year", event.target.value)}
        >
          <option value="">Todos</option>
          {years.map((year) => (
            <option key={year} value={String(year)}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <div className="sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-tquot-teal px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#00b396] disabled:opacity-60"
        >
          {pending ? "Filtrando…" : "Aplicar filtros"}
        </button>
      </div>
    </form>
  );
}

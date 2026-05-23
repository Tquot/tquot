"use client";

import { useEffect, useState } from "react";
import type { ResolvedLocation } from "@/lib/parser/airport-resolution";

interface AirportPickerProps {
  label: string;
  resolved: ResolvedLocation;
  onSelect: (iata: string | "all") => void;
  defaultMode?: "single" | "all";
}

export function AirportPicker({
  label,
  resolved,
  onSelect,
  defaultMode = "single",
}: AirportPickerProps) {
  const initialSelected =
    defaultMode === "all" ? "all" : (resolved.airports[0]?.iata ?? "all");
  const [selected, setSelected] = useState(initialSelected);

  useEffect(() => {
    onSelect(initialSelected);
  }, [initialSelected]);

  if (!resolved.isMultiAirport) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          {label}
        </div>
        <div className="mt-1 font-medium text-neutral-900">
          {resolved.cityDisplayName} ({resolved.airports[0].iata})
        </div>
      </div>
    );
  }

  function handleChange(value: string) {
    onSelect(value);
    if (value !== selected) {
      setSelected(value);
    }
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-xs uppercase tracking-wider text-amber-800">
          {label} · Elige aeropuerto
        </div>
        <div className="text-xs text-amber-700">
          {resolved.cityDisplayName} tiene {resolved.airports.length} aeropuertos
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <label
          onClick={() => handleChange("all")}
          className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition ${
            selected === "all"
              ? "border-amber-600 bg-white"
              : "border-transparent hover:bg-white/60"
          }`}
        >
          <input
            type="radio"
            name={`picker-${label}`}
            value="all"
            checked={selected === "all"}
            onChange={(e) => handleChange(e.target.value)}
            onClick={() => handleChange("all")}
            className="h-4 w-4"
          />
          <div className="flex-1">
            <div className="font-medium text-neutral-900">
              Buscar en todos los aeropuertos
            </div>
            <div className="text-xs text-neutral-600">
              {resolved.airports.map((a) => a.iata).join(" · ")}
            </div>
          </div>
        </label>

        {resolved.airports.map((ap, idx) => (
          <label
            key={ap.iata}
            onClick={() => handleChange(ap.iata)}
            className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition ${
              selected === ap.iata
                ? "border-amber-600 bg-white"
                : "border-transparent hover:bg-white/60"
            }`}
          >
            <input
              type="radio"
              name={`picker-${label}`}
              value={ap.iata}
              checked={selected === ap.iata}
              onChange={(e) => handleChange(e.target.value)}
              onClick={() => handleChange(ap.iata)}
              className="h-4 w-4"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-neutral-900">
                  {ap.iata}
                </span>
                {idx === 0 && (
                  <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                    Principal
                  </span>
                )}
              </div>
              <div className="text-sm text-neutral-700">{ap.name}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

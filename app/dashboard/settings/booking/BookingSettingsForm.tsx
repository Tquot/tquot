"use client";

import { useState, useTransition } from "react";
import type { AgencyBookingConfig } from "@/lib/booking-handoff/types";

interface Props {
  initial: AgencyBookingConfig;
  action: (patch: Partial<Omit<AgencyBookingConfig, "agencyId">>) => Promise<void>;
}

export function BookingSettingsForm({ initial, action }: Props) {
  const [hotelbedsUrl, setHotelbedsUrl] = useState(initial.hotelbedsExtranetUrl);
  const [airlines, setAirlines] = useState(initial.preferredAirlineSites);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const submit = () => {
    startTransition(async () => {
      await action({
        hotelbedsExtranetUrl: hotelbedsUrl,
        preferredAirlineSites: airlines,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const updateAirline = (iata: string, url: string) => {
    setAirlines({ ...airlines, [iata.toUpperCase()]: url });
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold">Hotelbeds</h2>
        <label className="mb-1 block text-xs text-neutral-600">URL del extranet</label>
        <input
          type="url"
          value={hotelbedsUrl}
          onChange={(e) => setHotelbedsUrl(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          placeholder="https://app.hotelbeds.com"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Si tu cuenta usa una URL específica (subdomain corporativo), edítala aquí.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Aerolíneas</h2>
        <p className="mb-3 text-xs text-neutral-600">
          URL que se abre al hacer click en &quot;Reservar vuelo&quot;. Indexado por código IATA (IB,
          VY, FR, etc.).
        </p>
        <div className="space-y-2">
          {Object.entries(airlines).map(([iata, url]) => (
            <div key={iata} className="flex items-center gap-2">
              <code className="w-12 font-mono text-sm">{iata}</code>
              <input
                type="url"
                value={url}
                onChange={(e) => updateAirline(iata, e.target.value)}
                className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
              />
            </div>
          ))}
        </div>
        <AddAirlineRow onAdd={updateAirline} />
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
        {saved && <span className="text-sm text-emerald-600">✓ Guardado</span>}
      </div>
    </div>
  );
}

function AddAirlineRow({ onAdd }: { onAdd: (iata: string, url: string) => void }) {
  const [iata, setIata] = useState("");
  const [url, setUrl] = useState("");

  return (
    <div className="mt-3 flex items-center gap-2 border-t border-neutral-200 pt-3">
      <input
        type="text"
        value={iata}
        onChange={(e) => setIata(e.target.value.toUpperCase())}
        placeholder="IATA"
        maxLength={3}
        className="w-12 rounded-md border border-neutral-300 px-2 py-1.5 font-mono text-sm"
      />
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      />
      <button
        type="button"
        onClick={() => {
          if (iata.length >= 2 && url) {
            onAdd(iata, url);
            setIata("");
            setUrl("");
          }
        }}
        className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm hover:bg-neutral-200"
      >
        Añadir
      </button>
    </div>
  );
}

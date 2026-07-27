import type { InferredPreferences } from "@/lib/clients/types";
import { ClientPreferencesBadges } from "./ClientPreferencesBadges";

interface Props {
  preferences: InferredPreferences;
  quoteCount: number;
}

export function ClientDetailPanel({ preferences, quoteCount }: Props) {
  return (
    <div className="rounded-xl border border-tquot-border bg-tquot-surface p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-tquot-text">
          Preferencias inferidas
        </h2>
        <span className="text-xs text-tquot-muted">
          basado en {quoteCount} cotizaci{quoteCount === 1 ? "ón" : "ones"}
        </span>
      </div>
      <ClientPreferencesBadges preferences={preferences} />
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
        <Row label="Tier hotel" value={preferences.preferredHotelTier} />
        <Row
          label="Estilos preferidos"
          value={preferences.preferredHotelStyles.join(", ") || "—"}
        />
        <Row
          label="Destinos frecuentes"
          value={
            preferences.frequentDestinations
              .map((d) => `${d.destination} (${d.count})`)
              .join(", ") || "—"
          }
        />
        <Row
          label="Tamaño grupo habitual"
          value={preferences.typicalGroupSize?.toString() ?? "—"}
        />
        <Row label="Audience" value={preferences.typicalAudience ?? "—"} />
        <Row
          label="Presupuesto medio"
          value={
            preferences.averageBudgetEur
              ? `${preferences.averageBudgetEur} EUR`
              : "—"
          }
        />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <>
      <dt className="text-tquot-muted">{label}</dt>
      <dd className="text-tquot-text">{value || "—"}</dd>
    </>
  );
}

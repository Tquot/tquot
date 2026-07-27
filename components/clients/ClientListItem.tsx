import Link from "next/link";
import type { Client } from "@/lib/clients/types";
import { ClientPreferencesBadges } from "./ClientPreferencesBadges";

interface Props {
  client: Client;
}

export function ClientListItem({ client }: Props) {
  return (
    <Link
      href={`/dashboard/clients/${client.id}`}
      className="flex items-center justify-between rounded-xl border border-tquot-border bg-tquot-surface px-4 py-3 shadow-sm transition hover:bg-tquot-bg"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <h2 className="truncate text-sm font-semibold text-tquot-text">
            {client.name}
          </h2>
          <span className="text-xs text-tquot-muted">{client.email ?? "—"}</span>
        </div>
        <div className="mt-1">
          <ClientPreferencesBadges preferences={client.inferredPreferences} />
        </div>
      </div>
      <div className="ml-4 shrink-0 text-right">
        <div className="text-sm font-semibold tabular-nums text-tquot-text">
          {client.totalQuotes} cotizaciones
        </div>
        <div className="text-xs text-tquot-muted">
          {client.lastQuoteAt
            ? `Última: ${new Date(client.lastQuoteAt).toLocaleDateString("es-ES")}`
            : "Nunca"}
        </div>
      </div>
    </Link>
  );
}

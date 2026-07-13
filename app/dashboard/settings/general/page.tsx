import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentAgencyId } from "@/lib/auth";
import { AGENCY_CURRENCY_OPTIONS } from "@/lib/currency/types";
import { updateAgencyBaseCurrency } from "./actions";
import { CurrencySettingsForm } from "./CurrencySettingsForm";

export default async function GeneralSettingsPage() {
  const agencyId = await getCurrentAgencyId();
  let baseCurrency = "EUR";

  if (agencyId) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("agencies")
      .select("base_currency, name")
      .eq("id", agencyId)
      .maybeSingle();
    if (data?.base_currency) {
      baseCurrency = String(data.base_currency).toUpperCase();
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex text-sm text-neutral-500 hover:text-neutral-800"
      >
        ← Volver al dashboard
      </Link>
      <h1 className="mb-1 text-xl font-semibold">Configuración general</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Preferencias de la agencia que afectan a todas las cotizaciones.
      </p>

      <CurrencySettingsForm
        baseCurrency={baseCurrency}
        currencies={[...AGENCY_CURRENCY_OPTIONS]}
        action={updateAgencyBaseCurrency}
      />
    </div>
  );
}

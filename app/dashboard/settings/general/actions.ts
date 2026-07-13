"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAgencyId } from "@/lib/auth";
import { AGENCY_CURRENCY_OPTIONS } from "@/lib/currency/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function updateAgencyBaseCurrency(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const raw = String(formData.get("base_currency") ?? "").toUpperCase();
  if (
    !AGENCY_CURRENCY_OPTIONS.includes(
      raw as (typeof AGENCY_CURRENCY_OPTIONS)[number],
    )
  ) {
    return { ok: false, error: "Moneda no soportada" };
  }

  const agencyId = await getCurrentAgencyId();
  if (!agencyId) return { ok: false, error: "Agencia no encontrada" };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("agencies")
    .update({ base_currency: raw })
    .eq("id", agencyId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/settings/general");
  revalidatePath("/dashboard");
  return { ok: true };
}

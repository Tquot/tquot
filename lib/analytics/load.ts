import "server-only";

import { cached } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache/keys";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AgencyAnalytics, RangePreset } from "./types";

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function resolveRange(preset: RangePreset): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // fin de hoy (exclusive)

  switch (preset) {
    case "7d":
      return { from: addDays(to, -7), to };
    case "30d":
      return { from: addDays(to, -30), to };
    case "90d":
      return { from: addDays(to, -90), to };
    case "ytd":
      return { from: new Date(now.getFullYear(), 0, 1), to };
    case "month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to };
    case "prev_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 1),
      };
    default:
      return { from: addDays(to, -30), to };
  }
}

export async function loadAnalyticsFresh(
  agencyId: string,
  preset: RangePreset,
): Promise<AgencyAnalytics> {
  const { from, to } = resolveRange(preset);
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("agency_analytics", {
    p_agency_id: agencyId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error) throw new Error(`analytics_failed: ${error.message}`);
  return data as AgencyAnalytics;
}

export async function loadAnalytics(
  agencyId: string,
  preset: RangePreset,
): Promise<AgencyAnalytics> {
  return cached(
    cacheKeys.analytics(agencyId, preset),
    () => loadAnalyticsFresh(agencyId, preset),
    { tier: "analytics", staleWhileRevalidate: true },
  );
}


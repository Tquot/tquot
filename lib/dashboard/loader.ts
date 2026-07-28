import "server-only";

import { getCurrentAgencyId, getCurrentUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface DashboardMetrics {
  agencyName: string;
  quotesThisMonth: number;
  quotesDelta: number;
  totalQuoted: number;
  activeClients: number;
  conversionRate: number;
  averageTicket: number;
  currencySymbol: string;
  last30Days: Array<{ date: string; value: number }>;
}

type QuoteSnapshot = {
  pricing?: {
    finalTotal?: number;
    currency?: string;
  };
};

export async function loadDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createServerSupabaseClient();
  const [agencyId, userId] = await Promise.all([
    getCurrentAgencyId(),
    getCurrentUserId(),
  ]);

  if (!userId) {
    throw new Error("No autenticado");
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  ).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();

  const [thisMonth, prevMonth, allStatuses, byDay, activeClients, agency] =
    await Promise.all([
      (agencyId
        ? supabase
            .from("quotes")
            .select("id, total_public_price, currency, snapshot", {
              count: "exact",
            })
            .eq("agency_id", agencyId)
            .gte("created_at", monthStart)
        : supabase
            .from("quotes")
            .select("id, total_public_price, currency, snapshot", {
              count: "exact",
            })
            .eq("user_id", userId)
            .gte("created_at", monthStart)),
      (agencyId
        ? supabase
            .from("quotes")
            .select("id", { count: "exact", head: true })
            .eq("agency_id", agencyId)
            .gte("created_at", prevMonthStart)
            .lt("created_at", monthStart)
        : supabase
            .from("quotes")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("created_at", prevMonthStart)
            .lt("created_at", monthStart)),
      (agencyId
        ? supabase
            .from("quotes")
            .select("status")
            .eq("agency_id", agencyId)
        : supabase.from("quotes").select("status").eq("user_id", userId)),
      (agencyId
        ? supabase
            .from("quotes")
            .select("created_at")
            .eq("agency_id", agencyId)
            .gte("created_at", thirtyDaysAgo)
        : supabase
            .from("quotes")
            .select("created_at")
            .eq("user_id", userId)
            .gte("created_at", thirtyDaysAgo)),
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("last_quote_at", "is", null)
        .gte("last_quote_at", ninetyDaysAgo),
      agencyId
        ? supabase.from("agencies").select("name, base_currency").eq("id", agencyId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  const quotesThisMonth = thisMonth.count ?? 0;
  const quotesPrevMonth = prevMonth.count ?? 0;
  const quotesDelta =
    quotesPrevMonth > 0
      ? Math.round(((quotesThisMonth - quotesPrevMonth) / quotesPrevMonth) * 100)
      : 0;

  const totalQuoted = (thisMonth.data ?? []).reduce((sum, quote) => {
    const snapshot = quote.snapshot as QuoteSnapshot | null;
    const snapshotPrice = snapshot?.pricing?.finalTotal;
    return sum + Number(snapshotPrice ?? quote.total_public_price ?? 0);
  }, 0);

  const terminalStatuses = (allStatuses.data ?? []).filter(
    (quote) => quote.status && quote.status !== "draft",
  );
  const acceptedStatuses = terminalStatuses.filter((quote) =>
    ["accepted", "reserved"].includes(String(quote.status)),
  );
  const conversionRate =
    terminalStatuses.length > 0
      ? Math.round((acceptedStatuses.length / terminalStatuses.length) * 100)
      : 0;

  const averageTicket =
    quotesThisMonth > 0 ? Math.round(totalQuoted / quotesThisMonth) : 0;

  const dayMap = new Map<string, number>();
  for (const quote of byDay.data ?? []) {
    const day = String(quote.created_at).slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }

  const last30Days = Array.from({ length: 30 }, (_, index) => {
    const day = new Date(Date.now() - (29 - index) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return { date: day, value: dayMap.get(day) ?? 0 };
  });

  const currencyCode = String(agency.data?.base_currency ?? "EUR").toUpperCase();

  return {
    agencyName: agency.data?.name ?? "Tu agencia",
    quotesThisMonth,
    quotesDelta,
    totalQuoted,
    activeClients: activeClients.count ?? 0,
    conversionRate,
    averageTicket,
    currencySymbol: currencyCode === "EUR" ? "€" : currencyCode,
    last30Days,
  };
}

import "server-only";

import {
  mapAgencyBranding,
  type AgencyBranding,
} from "@/lib/branding/types";
import type { Quote } from "@/lib/quote-engine/types";
import { createServiceClient } from "@/lib/supabase/service";

interface ResolveResult {
  quote: Quote | null;
  branding?: AgencyBranding;
  shareExpired: boolean;
  shareRevoked: boolean;
}

/**
 * Carga un quote a partir del token público. Sin sesión de usuario;
 * usa service_role para saltarse RLS.
 */
export async function resolveShare(token: string): Promise<ResolveResult> {
  const supabase = createServiceClient();

  const { data: share } = await supabase
    .from("quote_shares")
    .select("quote_id, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!share) {
    return { quote: null, shareExpired: false, shareRevoked: false };
  }

  if (share.revoked_at) {
    return { quote: null, shareExpired: false, shareRevoked: true };
  }
  if (new Date(share.expires_at as string) < new Date()) {
    return { quote: null, shareExpired: true, shareRevoked: false };
  }

  const { data: quoteRow } = await supabase
    .from("quotes")
    .select("snapshot, agency_id, destination, departure_date, return_date, total_public_price, currency")
    .eq("id", share.quote_id)
    .maybeSingle();

  if (!quoteRow) {
    return { quote: null, shareExpired: false, shareRevoked: false };
  }

  const { data: brandingRow } = await supabase
    .from("agency_branding")
    .select("*")
    .eq("agency_id", quoteRow.agency_id)
    .maybeSingle();

  const { data: agencyRow } = await supabase
    .from("agencies")
    .select("id, name, logo_url, legal_name, email, phone, website, address")
    .eq("id", quoteRow.agency_id)
    .maybeSingle();

  void supabase.rpc("increment_share_view", { p_token: token });

  const snapshot = quoteRow.snapshot as Quote | null;
  const branding =
    agencyRow != null
      ? mapAgencyBranding(agencyRow, brandingRow, String(agencyRow.id))
      : undefined;

  if (snapshot) {
    return {
      quote: snapshot,
      branding,
      shareExpired: false,
      shareRevoked: false,
    };
  }

  // Fallback si aún no hay snapshot (cotizaciones guardadas antes del bloque E)
  const fallbackQuote = {
    id: share.quote_id as string,
    summary: {
      route: String(quoteRow.destination ?? ""),
      durationDays: 1,
      passengers: { adults: 1, children: 0, total: 1 },
    },
    flights: [],
    transfers: [],
    hotels: [],
    experiences: [],
    pricing: {
      baseTotal: Number(quoteRow.total_public_price ?? 0),
      margin: 0,
      finalTotal: Number(quoteRow.total_public_price ?? 0),
      currency: "EUR" as const,
    },
    _meta: {
      flightsSource: "mock" as const,
      hotelsSource: "mock" as const,
      experiencesSource: "mock" as const,
      transfersSource: "mock" as const,
    },
  } satisfies Quote;

  return {
    quote: fallbackQuote,
    branding,
    shareExpired: false,
    shareRevoked: false,
  };
}

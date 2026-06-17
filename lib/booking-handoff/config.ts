import "server-only";
import { getCurrentAgencyId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AgencyBookingConfig } from "./types";

const DEFAULTS: Omit<AgencyBookingConfig, "agencyId"> = {
  hotelbedsExtranetUrl: "https://app.hotelbeds.com",
  preferredAirlineSites: {
    IB: "https://www.iberia.com/es/",
    VY: "https://www.vueling.com/es",
    FR: "https://www.ryanair.com/es/es",
    UX: "https://www.aireuropa.com/es/es",
    AF: "https://www.airfrance.es/",
    LH: "https://www.lufthansa.com/es/es/",
    BA: "https://www.britishairways.com/es-es/",
    AZ: "https://www.ita-airways.com/es_es/",
    KL: "https://www.klm.com/es/es",
    LX: "https://www.swiss.com/es/es/",
  },
  defaultLocale: "es-ES",
};

export async function loadBookingConfig(): Promise<AgencyBookingConfig> {
  const supabase = await createServerSupabaseClient();
  const agencyId = await getCurrentAgencyId();
  if (!agencyId) throw new Error("no_agency_context");

  const { data, error } = await supabase
    .from("agency_booking_config")
    .select("*")
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      agencyId,
      ...DEFAULTS,
    };
  }

  return {
    agencyId,
    hotelbedsExtranetUrl:
      data.hotelbeds_extranet_url ?? DEFAULTS.hotelbedsExtranetUrl,
    preferredAirlineSites: {
      ...DEFAULTS.preferredAirlineSites,
      ...(data.preferred_airline_sites ?? {}),
    },
    preferredHotelBookingSite: data.preferred_hotel_booking_site ?? undefined,
    defaultLocale: data.default_locale ?? DEFAULTS.defaultLocale,
  };
}

/**
 * Server action para actualizar la configuración. Usar desde la página de settings.
 */
export async function updateBookingConfig(
  patch: Partial<Omit<AgencyBookingConfig, "agencyId">>,
) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const agencyId = await getCurrentAgencyId();
  if (!agencyId) throw new Error("no_agency_context");

  const dbPatch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.hotelbedsExtranetUrl != null) {
    dbPatch.hotelbeds_extranet_url = patch.hotelbedsExtranetUrl;
  }
  if (patch.preferredAirlineSites != null) {
    dbPatch.preferred_airline_sites = patch.preferredAirlineSites;
  }
  if (patch.preferredHotelBookingSite !== undefined) {
    dbPatch.preferred_hotel_booking_site = patch.preferredHotelBookingSite;
  }
  if (patch.defaultLocale != null) {
    dbPatch.default_locale = patch.defaultLocale;
  }

  const { error } = await supabase
    .from("agency_booking_config")
    .upsert({ agency_id: agencyId, ...dbPatch }, { onConflict: "agency_id" });

  if (error) throw error;
}

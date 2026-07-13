import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";
import { getConnectionWithCredentials } from "@/lib/connectors/storage";
import { buildComparison } from "@/lib/comparator/orchestrator";
import type { ProviderKey } from "@/lib/comparator/types";

export const runtime = "nodejs";

const ProviderSchema = z.enum([
  "hotelbeds",
  "booking",
  "expedia",
  "ratehawk",
  "own",
]);

const RequestSchema = z.object({
  hotelName: z.string().optional(),
  destination: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.array(
    z.object({
      adults: z.number(),
      children: z.number().optional(),
    }),
  ),
  excludeProvider: ProviderSchema.optional(),
  additionalProviders: z.array(ProviderSchema).default([]),
  /** Snapshot del hotel en la cotización abierta (fuente de verdad del original). */
  hotel: z
    .object({
      id: z.string(),
      name: z.string(),
      provider: ProviderSchema,
      netPrice: z.number(),
      currency: z.string(),
      fetchedAt: z.string(),
      hotelCode: z.string().optional(),
      rateKey: z.string().optional(),
      connectionId: z.string().optional(),
      nights: z.number().optional(),
    })
    .optional(),
});

async function resolveBookingKey(agencyId: string): Promise<string | undefined> {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const { data: connections } = await supabase
    .from("agency_connections")
    .select("id, provider_id")
    .eq("agency_id", agencyId)
    .eq("provider_id", "booking");

  const connectionId = connections?.[0]?.id;
  if (!connectionId) {
    return process.env.RAPIDAPI_KEY;
  }

  const connection = await getConnectionWithCredentials(connectionId);
  return connection?.credentials.rapidapi_key;
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUserAndAgency(req);
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid_request" }), {
      status: 400,
    });
  }

  const {
    excludeProvider,
    additionalProviders,
    hotel: hotelBody,
    hotelName,
    destination,
    checkIn,
    checkOut,
    guests,
  } = parsed.data;

  if (!hotelBody && !hotelName) {
    return new Response(JSON.stringify({ error: "hotel_required" }), {
      status: 400,
    });
  }

  const bookingApiKey = await resolveBookingKey(auth.agencyId);

  const hotel = hotelBody ?? {
    id: "unknown",
    name: hotelName!,
    provider: (excludeProvider ?? "hotelbeds") as ProviderKey,
    netPrice: 0,
    currency: "EUR",
    fetchedAt: new Date().toISOString(),
  };

  const providers = (
    additionalProviders.length > 0
      ? additionalProviders
      : (["hotelbeds", "booking", "expedia"] as ProviderKey[])
  ).filter((p) => p !== (excludeProvider ?? hotel.provider));

  try {
    const comparison = await buildComparison({
      hotelId: hotel.id,
      hotel,
      searchContext: { destination, checkIn, checkOut, guests },
      providers,
      bookingApiKey,
    });

    // Compatibilidad con HotelCompareModal legacy (prices/errors) + formato Block A.
    const prices = comparison.entries
      .filter((e) => e.source === "live" && e.available && e.totalPrice != null)
      .map((e) => ({
        provider: e.provider,
        netPrice: e.totalPrice!,
        currency: e.currency,
        rateKey: e.rateKey,
        fetchedAt: e.fetchedAt,
        source: "live" as const,
      }));

    const errors = comparison.entries
      .filter((e) => e.source === "live" && !e.available)
      .map((e) => ({
        provider: e.provider,
        message: e.error ?? "not_found",
      }));

    return Response.json({
      ...comparison,
      prices,
      errors,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "unknown",
      }),
      { status: 500 },
    );
  }
}

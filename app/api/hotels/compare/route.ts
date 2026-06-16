import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";
import { getConnectionWithCredentials } from "@/lib/connectors/storage";
import { queryBookingPrice } from "@/lib/providers/booking";
import { queryExpediaPrice } from "@/lib/providers/expedia";
import type { HotelPriceQuote, HotelProvider } from "@/lib/quote-engine/types";
import type { ProviderSearchParams } from "@/lib/providers/types";

export const runtime = "nodejs";

const RequestSchema = z.object({
  hotelName: z.string(),
  destination: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.array(
    z.object({
      adults: z.number(),
      children: z.number().optional(),
    }),
  ),
  excludeProvider: z.enum(["hotelbeds", "booking", "expedia"]),
  additionalProviders: z.array(z.enum(["hotelbeds", "booking", "expedia"])),
});

type ProviderQuerier = (
  params: ProviderSearchParams,
  context?: Record<string, string>,
) => Promise<{
  netPrice: number;
  currency: string;
  rateKey?: string;
  meta?: Record<string, unknown>;
}>;

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

  const { excludeProvider, additionalProviders, ...searchParams } = parsed.data;
  const targets = additionalProviders.filter((provider) => provider !== excludeProvider);
  const bookingKey = await resolveBookingKey(auth.agencyId);

  const PROVIDER_QUERIERS: Record<HotelProvider, ProviderQuerier> = {
    booking: (params) => queryBookingPrice(params, bookingKey),
    expedia: (params) => queryExpediaPrice(params),
    hotelbeds: () => {
      throw new Error("use snapshot");
    },
  };

  const results = await Promise.allSettled(
    targets.map(async (provider): Promise<HotelPriceQuote> => {
      const result = await PROVIDER_QUERIERS[provider](searchParams);
      return {
        provider,
        netPrice: result.netPrice,
        currency: result.currency,
        rateKey: result.rateKey,
        fetchedAt: new Date().toISOString(),
        source: "live",
        meta: result.meta,
      };
    }),
  );

  const prices: HotelPriceQuote[] = [];
  const errors: { provider: HotelProvider; message: string }[] = [];

  results.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      prices.push(result.value);
    } else {
      errors.push({
        provider: targets[idx],
        message:
          result.reason instanceof Error ? result.reason.message : "unknown",
      });
    }
  });

  return Response.json({ prices, errors });
}

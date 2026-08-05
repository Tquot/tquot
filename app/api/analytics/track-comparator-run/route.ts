import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { invalidatePattern } from "@/lib/cache";

const EntrySchema = z.object({
  provider: z.string(),
  total_price: z.number(),
  available: z.boolean(),
  source: z.enum(["snapshot", "live"]),
});

const BodySchema = z.object({
  quote_id: z.string().uuid().optional().nullable(),
  hotel_name: z.string().min(1),
  nights: z.number().int().min(0),
  entries: z.array(EntrySchema).nonempty(),
  chosen_provider: z.string().min(1),
  chosen_total: z.number(),
});

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUserAndAgency(req);
  if ("response" in auth) return auth.response;

  const body = BodySchema.parse(await req.json());

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("comparator_runs").insert({
    quote_id: body.quote_id ?? null,
    agency_id: auth.agencyId,
    agent_id: auth.userId,
    hotel_name: body.hotel_name,
    nights: body.nights,
    entries: body.entries,
    chosen_provider: body.chosen_provider,
    chosen_total: body.chosen_total,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "insert_failed" },
      { status: 400 },
    );
  }

  // Best-effort: keep dashboard fresh.
  await invalidatePattern(`analytics:${auth.agencyId}:*`);
  revalidatePath("/analytics");

  return NextResponse.json({ ok: true });
}


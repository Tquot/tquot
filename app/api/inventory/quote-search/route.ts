import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchInventoryForQuote } from "@/lib/inventory/search-for-quote";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const RequestBodySchema = z.object({
  destination: z.string().min(1),
  accessibility: z.boolean().optional().default(false),
  hotelLevel: z
    .enum(["budget", "standard", "premium", "luxury"])
    .optional()
    .default("standard"),
  durationDays: z.number().int().min(1).optional().default(1),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: z.infer<typeof RequestBodySchema>;
  try {
    body = RequestBodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid body", details: (err as Error).message },
      { status: 400 },
    );
  }

  const result = await searchInventoryForQuote(user.id, {
    destination: body.destination,
    accessibility: body.accessibility,
    hotelLevel: body.hotelLevel,
    durationDays: body.durationDays,
  });

  return NextResponse.json(result);
}

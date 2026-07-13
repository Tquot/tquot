import { NextRequest } from "next/server";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Spec Block A sugería GET /api/quotes/[id]/compare leyendo quotes.snapshot.
 * En TQuot no existe snapshot jsonb: la comparación live usa
 * POST /api/hotels/compare con el HotelDetails en memoria.
 *
 * Este endpoint documenta la adaptación y evita 404 si alguien llama la URL del spec.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthenticatedUserAndAgency(req);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const hotelId = new URL(req.url).searchParams.get("hotelId");

  const supabase = await createServerSupabaseClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!quote) {
    return Response.json({ error: "quote_not_found" }, { status: 404 });
  }

  return Response.json(
    {
      error: "snapshot_not_persisted",
      message:
        "TQuot no persiste quotes.snapshot. Usa POST /api/hotels/compare con el hotel en memoria de la cotización abierta.",
      quoteId: id,
      hotelId,
    },
    { status: 501 },
  );
}

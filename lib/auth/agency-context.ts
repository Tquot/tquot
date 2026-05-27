import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/api/parser/_auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAuthenticatedUserAndAgency(
  _req?: NextRequest,
): Promise<
  { userId: string; agencyId: string } | { response: NextResponse }
> {
  const auth = await getAuthenticatedUser();
  if (auth.response) {
    return { response: auth.response };
  }

  const supabase = await createServerSupabaseClient();
  const { data: agency, error } = await supabase
    .from("agencies")
    .select("id")
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  if (error) {
    return {
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  if (!agency) {
    return {
      response: NextResponse.json(
        {
          error:
            "Agencia no configurada. Crea tu agencia antes de continuar.",
        },
        { status: 403 },
      ),
    };
  }

  return { userId: auth.user.id, agencyId: agency.id };
}

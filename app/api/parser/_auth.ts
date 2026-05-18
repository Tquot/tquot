import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  return { user, response: null };
}

export function validateAgentId(agentId: string, userId: string) {
  if (agentId !== userId) {
    return NextResponse.json(
      { error: "agentId no coincide con el usuario autenticado" },
      { status: 403 },
    );
  }

  return null;
}

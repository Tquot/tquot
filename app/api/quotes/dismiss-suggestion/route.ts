import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/api/parser/_auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (auth.response) return auth.response;

  let body: { quoteId?: string; suggestionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { quoteId, suggestionId } = body;
  if (!quoteId || !suggestionId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("append_dismissed_suggestion", {
    p_quote_id: quoteId,
    p_suggestion_id: suggestionId,
  });

  if (error) {
    // Fallback: merge into metadata jsonb if RPC missing
    const { data, error: readErr } = await supabase
      .from("quotes")
      .select("metadata")
      .eq("id", quoteId)
      .maybeSingle();
    if (readErr) {
      return NextResponse.json({ error: readErr.message }, { status: 500 });
    }
    const meta =
      data && typeof data.metadata === "object" && data.metadata !== null
        ? (data.metadata as Record<string, unknown>)
        : {};
    const prev = Array.isArray(meta.dismissed_suggestions)
      ? (meta.dismissed_suggestions as string[])
      : [];
    const next = prev.includes(suggestionId)
      ? prev
      : [...prev, suggestionId];
    const { error: writeErr } = await supabase
      .from("quotes")
      .update({
        metadata: { ...meta, dismissed_suggestions: next },
      })
      .eq("id", quoteId);
    if (writeErr) {
      return NextResponse.json({ error: writeErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

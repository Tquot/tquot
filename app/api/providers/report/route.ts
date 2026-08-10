import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const FIELDS = new Set(["name", "website", "email", "phone", "whole"]);

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUserAndAgency(req);
  if ("response" in auth) return auth.response;

  let body: {
    cacheKey?: string;
    providerId?: string;
    field?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { cacheKey, providerId, field, note } = body;
  if (!cacheKey || !providerId || !field || !FIELDS.has(field)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("external_provider_reports").insert({
    agency_id: auth.agencyId,
    cache_key: cacheKey,
    provider_id: providerId,
    field,
    note: note ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

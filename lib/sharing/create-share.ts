"use server";

import { nanoid } from "nanoid";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ShareCreateInput } from "./types";

interface CreateShareResult {
  token: string;
  expiresAt: string;
  url: string;
}

export async function createShare(
  input: ShareCreateInput,
): Promise<CreateShareResult> {
  const supabase = await createServerSupabaseClient();
  const ttlDays = input.ttlDays > 0 ? input.ttlDays : 30;

  const token = `sha_${nanoid(32)}`;
  const expiresAt = new Date(Date.now() + ttlDays * 86_400_000).toISOString();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("quote_shares").insert({
    quote_id: input.quoteId,
    token,
    expires_at: expiresAt,
    created_by: user?.id ?? null,
  });

  if (error) throw new Error(`share_create_failed: ${error.message}`);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://tquot.io";

  return {
    token,
    expiresAt,
    url: `${baseUrl.replace(/\/$/, "")}/q/${token}`,
  };
}

import { createBrowserClient } from "@supabase/ssr";

/** Same project credentials as middleware / server cookie session. */
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://huggxtbkfpucfbztceno.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_QvcOjBhSI00AVcuf0r8idQ_p45uX6CC";

/**
 * Browser Supabase client that shares the SSR cookie session
 * (same pattern as @supabase/ssr createBrowserClient).
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

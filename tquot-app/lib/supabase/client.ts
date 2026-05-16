import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

let browserClient: SupabaseClient | undefined;

export function createBrowserSupabaseClient() {
  if (typeof window === "undefined") {
    const { url, anonKey } = getSupabaseEnv();
    return createClient(url, anonKey);
  }

  if (!browserClient) {
    const { url, anonKey } = getSupabaseEnv();
    browserClient = createClient(url, anonKey);
  }

  return browserClient;
}

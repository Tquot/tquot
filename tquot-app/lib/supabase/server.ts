import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function createCookieStorage(cookieStore: CookieStore) {
  return {
    getItem(key: string) {
      return cookieStore.get(key)?.value ?? null;
    },
    setItem(key: string, value: string) {
      cookieStore.set(key, value, {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    },
    removeItem(key: string) {
      cookieStore.delete(key);
    },
  };
}

export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createClient(url, anonKey, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storage: createCookieStorage(cookieStore),
    },
  });
}

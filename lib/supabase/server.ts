import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = "https://huggxtbkfpucfbztceno.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_QvcOjBhSI00AVcuf0r8idQ_p45uX6CC";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll can be called from a Server Component; ignore if read-only.
        }
      },
    },
  });
}

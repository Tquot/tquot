import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "./env";

export async function createMiddlewareSupabaseClient(
  request: NextRequest,
  response: NextResponse,
): Promise<SupabaseClient> {
  const { url, anonKey } = getSupabaseEnv();

  return createClient(url, anonKey, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false,
      storage: {
        getItem(key: string) {
          return request.cookies.get(key)?.value ?? null;
        },
        setItem(key: string, value: string) {
          request.cookies.set(key, value);
          response.cookies.set(key, value, {
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });
        },
        removeItem(key: string) {
          request.cookies.delete(key);
          response.cookies.delete(key);
        },
      },
    },
  });
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = await createMiddlewareSupabaseClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && pathname.startsWith("/dashboard")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

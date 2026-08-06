import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { shouldRedirectModeratedUser } from "@/lib/moderation-redirect.mjs";

export async function updateSession(request: NextRequest) {
  const config = getSupabaseConfig();
  let response = NextResponse.next({ request });

  if (!config) {
    return response;
  }

  const supabase = createServerClient(
    config.url,
    config.publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          Object.entries(headersToSet).forEach(([name, value]) => {
            response.headers.set(name, value);
          });
        },
      },
    },
  );

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  const pathname = request.nextUrl.pathname;
  const skipsModerationRedirect =
    pathname === "/restricted" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/admin");

  if (claims?.sub && !skipsModerationRedirect) {
    const { data } = await supabase.rpc("get_my_moderation_status");
    const record = Array.isArray(data) ? data[0] : data;
    const status =
      record && typeof record === "object" && "status" in record
        ? record.status
        : null;

    if (shouldRedirectModeratedUser(status)) {
      const redirectResponse = NextResponse.redirect(
        new URL("/restricted", request.url),
      );

      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });

      return redirectResponse;
    }
  }

  return response;
}

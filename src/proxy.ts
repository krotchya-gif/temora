import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Konvensi Next.js 16: middleware kini bernama proxy (src/proxy.ts).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Tanpa env (mis. build lokal), proxy no-op — halaman tetap bisa dibangun.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookieOptions: {
      // Hardening task 019 — selaras dengan lib/supabase/server.ts.
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() selalu memvalidasi token ke server Auth — bukan sekadar baca cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gate /dashboard: wajib login, dan superadmin dialihkan ke /admin
  // (1 akun 1 peran — task 019).
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const redirectUrl = request.nextUrl.clone();
    if (!user) {
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }
    if (user.app_metadata?.role === "superadmin") {
      redirectUrl.pathname = "/admin";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Gate /admin: wajib login + superadmin (task 018). Cek ulang terjadi lagi
  // di layout & tiap API route (defense in depth).
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const redirectUrl = request.nextUrl.clone();
    if (!user) {
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }
    if (user.app_metadata?.role !== "superadmin") {
      // Terotentikasi tapi bukan superadmin → kembali ke dashboardnya.
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

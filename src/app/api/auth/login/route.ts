import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { allowRequest, getClientIp } from "@/lib/rate-limit";
import { humanAuthError, loginSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Brute-force brake app-level (task 019); Supabase punya limit bawaan juga.
  if (!allowRequest(`login-ip:${getClientIp(request)}`, 10)) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi beberapa menit." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Masukkan email dan kata sandi kamu." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return NextResponse.json(
      { error: humanAuthError(error.message) },
      { status: 401 },
    );
  }

  // Vendor yang dibanned admin ditolak meski kredensial benar (task 019).
  const { data: vendor } = await supabase
    .from("vendors")
    .select("banned_at")
    .eq("id", data.user.id)
    .maybeSingle();
  if (vendor?.banned_at) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Akun kamu dinonaktifkan. Hubungi admin TEMORA." },
      { status: 403 },
    );
  }

  // Superadmin diarahkan ke panel admin oleh client berdasar flag ini.
  return NextResponse.json({ ok: true, isAdmin: isSuperAdmin(data.user) });
}

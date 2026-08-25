import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { humanAuthError, loginSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
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

  // Superadmin diarahkan ke panel admin oleh client berdasar flag ini.
  return NextResponse.json({ ok: true, isAdmin: isSuperAdmin(data.user) });
}

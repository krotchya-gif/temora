import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return NextResponse.json(
      { error: humanAuthError(error.message) },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true });
}

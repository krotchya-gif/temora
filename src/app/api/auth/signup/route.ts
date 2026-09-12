import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { allowRequest, getClientIp } from "@/lib/rate-limit";
import { humanAuthError, signupSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!allowRequest(`signup-ip:${getClientIp(request)}`, 10)) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi beberapa menit." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data belum lengkap. Periksa kembali isian form-mu." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name } },
  });

  if (error) {
    return NextResponse.json(
      { error: humanAuthError(error.message) },
      { status: 400 },
    );
  }

  // Konfirmasi email aktif: belum ada session sampai user klik link email.
  if (!data.session) {
    return NextResponse.json({ needsEmailVerification: true });
  }

  return NextResponse.json({ ok: true });
}

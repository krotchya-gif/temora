import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { humanAuthError, signupSchema } from "@/lib/validation/auth";
import { enqueueWa } from "@/lib/whatsapp";

export async function POST(request: Request) {
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

  // WA selamat datang (task 009) — nomor diisi vendor belakangan via settings.
  if (data.user) {
    void enqueueWa(data.user.id, "welcome", { name: parsed.data.name });
  }

  return NextResponse.json({ ok: true });
}

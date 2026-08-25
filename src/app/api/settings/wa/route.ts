import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/whatsapp";

export const runtime = "nodejs";

// PUT /api/settings/wa — simpan nomor WhatsApp + opt-in (task 009).
export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { phone?: string; waOptIn?: boolean }
    | null;

  if (!body || typeof body.waOptIn !== "boolean") {
    return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
  }

  let phone: string | null = null;
  if (body.phone && body.phone.trim() !== "") {
    phone = normalizePhone(body.phone);
    if (!phone) {
      return NextResponse.json(
        {
          error:
            "Nomor WhatsApp belum tepat. Gunakan format Indonesia seperti 0812… atau 62812… ya.",
        },
        { status: 400 },
      );
    }
  }

  // Opt-in tanpa nomor → tidak ada yang bisa dikirim; tolak dengan pesan jelas.
  if (body.waOptIn && !phone) {
    const { data: currentVendor } = await supabase
      .from("vendors")
      .select("phone")
      .eq("id", user.id)
      .single();
    if (!currentVendor?.phone) {
      return NextResponse.json(
        { error: "Isi dulu nomor WhatsApp-mu sebelum mengaktifkan notifikasi ya." },
        { status: 400 },
      );
    }
  }

  const admin = createAdminClient();
  const update: Record<string, unknown> = { wa_opt_in: body.waOptIn };
  if (phone) update.phone = phone;

  const { error } = await admin.from("vendors").update(update).eq("id", user.id);
  if (error) {
    console.error("[settings.wa]", error.message);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan. Coba sekali lagi ya." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

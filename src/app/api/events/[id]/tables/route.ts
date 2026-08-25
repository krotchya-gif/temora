import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tablesGenerateSchema } from "@/lib/validation/photobooth";

export const runtime = "nodejs";

// POST /api/events/[id]/tables — generate N meja sekaligus (task 005).
// Auth via cookie session vendor; RLS t_owner_all menjamin kepemilikan.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: eventId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = tablesGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Jumlah meja harus angka 1–50." },
      { status: 400 },
    );
  }
  const { count, regenerateTableId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) {
    return NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 });
  }

  // Regenerate satu meja: hapus lalu buat ulang dengan label sama + UUID baru
  // (QR baru). Diblok bila meja masih punya foto agar atribusi tidak hilang.
  
  if (regenerateTableId) {
    const { data: target } = await supabase
      .from("tables")
      .select("id, label")
      .eq("id", regenerateTableId)
      .eq("event_id", event.id)
      .maybeSingle();
    if (!target) {
      return NextResponse.json(
        { error: "Meja yang mau diganti tidak ditemukan." },
        { status: 404 },
      );
    }

    const { count: photoCount } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("table_id", target.id);

    if ((photoCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            "Meja ini sudah punya momen terkumpul, jadi QR-nya tidak bisa diganti. Buat meja baru saja, ya.",
        },
        { status: 409 },
      );
    }

    const { error: deleteError } = await supabase
      .from("tables")
      .delete()
      .eq("id", target.id);
    if (deleteError) {
      console.error("[tables] delete:", deleteError.message);
      return NextResponse.json(
        { error: "Gagal mengganti meja. Coba sekali lagi ya." },
        { status: 500 },
      );
    }

    const { error: insertError } = await supabase.from("tables").insert({
      event_id: event.id,
      label: target.label,
    });
    if (insertError) {
      console.error("[tables] reinsert:", insertError.message);
      return NextResponse.json(
        { error: "Gagal membuat meja pengganti. Coba sekali lagi ya." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, regenerated: true });
  }

  // Label otomatis lanjut dari nomor yang sudah ada ("Meja 1", "Meja 2", …).
  const n = count ?? 1;
  const { data: existing } = await supabase
    .from("tables")
    .select("label")
    .eq("event_id", event.id);

  const numbers = (existing ?? [])
    .map((t) => /^Meja (\d+)$/.exec(t.label)?.[1])
    .filter((v): v is string => v !== null)
    .map(Number);
  const startNumber = numbers.length > 0 ? Math.max(...numbers) : 0;

  const rows = Array.from({ length: n }, (_, i) => ({
    event_id: event.id,
    label: `Meja ${startNumber + i + 1}`,
  }));

  const { data: created, error } = await supabase
    .from("tables")
    .insert(rows)
    .select("id, label");

  if (error || !created) {
    console.error("[tables] insert:", error?.message);
    return NextResponse.json(
      { error: "Gagal membuat meja. Coba sekali lagi ya." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, tables: created });
}

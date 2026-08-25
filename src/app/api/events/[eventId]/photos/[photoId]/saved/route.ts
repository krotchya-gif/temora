import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { savedSchema } from "@/lib/validation/photobooth";

export const runtime = "nodejs";

// Set guest_saved_at — metrik north star (PRD §4). Token validasi agar
// endpoint tidak bisa dipanggil sembarangan untuk foto orang lain.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string; photoId: string }> },
) {
  const { eventId, photoId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = savedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: photo } = await admin
    .from("photos")
    .select("id, metadata, guest_saved_at")
    .eq("id", photoId)
    .eq("event_id", eventId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!photo || photo.metadata?.capture_token !== parsed.data.captureToken) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  // Simpan waktu pertama kali disimpan (jangan timpa).
  if (!photo.guest_saved_at) {
    const { error } = await admin
      .from("photos")
      .update({ guest_saved_at: new Date().toISOString() })
      .eq("id", photo.id);

    if (error) {
      console.error("[saved] update:", error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

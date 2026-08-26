import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// GET — signed URL resolusi penuh untuk lightbox (bucket photos privat).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string; photoId: string }> },
) {
  const { eventId, photoId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  // RLS: foto event orang lain tidak terlihat → 404.
  const { data: photo } = await supabase
    .from("photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .eq("event_id", eventId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("photos")
    .createSignedUrl(photo.storage_path, 900);

  if (error || !signed) {
    console.error("[photos.signed]", error?.message);
    return NextResponse.json(
      { error: "Gagal membuka momen. Coba lagi ya." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, signedUrl: signed.signedUrl });
}

// DELETE — soft delete per database.md §7 (cron hard-delete Storage 30 hari).
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string; photoId: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { eventId, photoId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  const { data: photo } = await supabase
    .from("photos")
    .select("id")
    .eq("id", photoId)
    .eq("event_id", eventId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("photos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", photo.id);

  if (error) {
    console.error("[photos.delete]", error.message);
    return NextResponse.json(
      { error: "Gagal menghapus momen. Coba sekali lagi ya." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

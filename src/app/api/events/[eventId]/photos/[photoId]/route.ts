import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { downloadStorageFile } from "@/lib/storage";

export const runtime = "nodejs";

// GET — stream foto privat melalui API yang sudah mengautentikasi user.
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

  const url = new URL(_request.url);
  if (!url.searchParams.has("raw")) {
    return NextResponse.json({ ok: true, signedUrl: `/api/events/${eventId}/photos/${photoId}?raw=1` });
  }

  try {
    const media = await downloadStorageFile(photo.storage_path);
    return new NextResponse(media.bytes, {
      headers: { "Content-Type": media.contentType, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    console.error("[photos.download]", error);
    return NextResponse.json(
      { error: "Gagal membuka momen. Coba lagi ya." },
      { status: 500 },
    );
  }
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

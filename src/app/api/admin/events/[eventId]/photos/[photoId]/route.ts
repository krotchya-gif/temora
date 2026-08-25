import { NextResponse } from "next/server";
import { getSuperAdminOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// DELETE /api/admin/events/[eventId]/photos/[photoId] — moderasi foto
// (task 018). Soft delete konsisten dengan alur vendor (deleted_at);
// hard delete tetap tugas cron TTL agar storage purge seragam.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ eventId: string; photoId: string }> },
) {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { eventId, photoId } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("photos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", photoId)
    .eq("event_id", eventId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[admin] delete_photo:", error?.message ?? "foto tidak ditemukan");
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  console.info(
    "[admin]",
    JSON.stringify({
      action: "delete_photo",
      actor: actor.id,
      eventId,
      photoId,
    }),
  );

  return NextResponse.json({ ok: true });
}

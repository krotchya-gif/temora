import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron harian TTL foto (architecture.md §12, database.md §7):
// 1. Event yang expires_at lewat → hapus semua foto (Storage + row).
// 2. Soft delete > 30 hari → hard delete (Storage + row).
// Diproteksi header Authorization: Bearer ${CRON_SECRET}.

const GRACE_DAYS = 30;

function unauthorized() {
  return NextResponse.json({ ok: false }, { status: 401 });
}

async function removePrefix(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  prefix: string,
): Promise<number> {
  let removed = 0;
  let offset = 0;
  // storage.list paging 500 — loop sampai habis.
  for (;;) {
    const { data: objects, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: 500, offset });
    if (error || !objects || objects.length === 0) break;

    const paths = objects
      .filter((o) => o.name !== ".emptyFolderPlaceholder")
      .map((o) => `${prefix}/${o.name}`);
    if (paths.length > 0) {
      const { error: rmError } = await admin.storage.from(bucket).remove(paths);
      if (!rmError) removed += paths.length;
    }
    offset += objects.length;
    if (objects.length < 500) break;
  }
  return removed;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return unauthorized();

  const admin = createAdminClient();
  const now = new Date();
  const summary = {
    expiredEvents: 0,
    hardDeletedRows: 0,
    removedObjects: 0,
  };

  // 1. Event expired → purge seluruh fotonya.
  const { data: expiredEvents } = await admin
    .from("events")
    .select("id")
    .lt("expires_at", now.toISOString());

  for (const event of expiredEvents ?? []) {
    summary.removedObjects += await removePrefix(
      admin,
      "photos",
      `photos/${event.id}`,
    );
    summary.removedObjects += await removePrefix(
      admin,
      "thumbs",
      `thumbs/${event.id}`,
    );
    const { error } = await admin
      .from("photos")
      .delete()
      .eq("event_id", event.id);
    if (!error) summary.expiredEvents += 1;
    else console.error("[photo-ttl] purge rows:", error.message);
  }

  // 2. Soft delete lebih lama dari grace period → hard delete.
  const graceCutoff = new Date(now.getTime() - GRACE_DAYS * 86_400_000);
  const { data: stale } = await admin
    .from("photos")
    .select("id, storage_path, thumb_path")
    .not("deleted_at", "is", null)
    .lt("deleted_at", graceCutoff.toISOString())
    .limit(1000);

  for (const photo of stale ?? []) {
    const paths = [photo.storage_path, photo.thumb_path].filter(
      (p): p is string => Boolean(p),
    );
    if (paths.length > 0) {
      await admin.storage.from("photos").remove(paths.filter((p) => p.startsWith("photos/")));
      await admin.storage.from("thumbs").remove(paths.filter((p) => p.startsWith("thumbs/")));
      summary.removedObjects += paths.length;
    }
    const { error } = await admin.from("photos").delete().eq("id", photo.id);
    if (!error) summary.hardDeletedRows += 1;
    else console.error("[photo-ttl] hard delete:", error.message);
  }

  return NextResponse.json({ ok: true, ...summary });
}

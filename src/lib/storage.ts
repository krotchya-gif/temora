// Helper URL Storage (database.md §6):
// thumbs & frames publik → URL langsung; photos privat → signed URL server-side.

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export function publicStorageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${path}`;
}

/** Hapus semua objek di bawah prefix (dipakai purge event & cron TTL). */
export async function removePrefix(
  admin: Admin,
  bucket: string,
  prefix: string,
): Promise<number> {
  let removed = 0;
  let offset = 0;
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

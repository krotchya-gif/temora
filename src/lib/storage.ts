// Helper URL Storage (database.md §6):
// thumbs & frames publik → URL langsung; photos privat → signed URL server-side.

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export function publicStorageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${path}`;
}

/**
 * Hapus semua objek di bawah prefix — REKURSIF terhadap subfolder
 * (entri folder dari list() punya id null). Dipakai purge event & cron TTL:
 * tanpa rekursi, photos/{eventId}/{tableId}/*.jpg dan zips/{eventId}/…
 * tertinggal sebagai orphan yang menggerus kuota Storage.
 */
export async function removePrefix(
  admin: Admin,
  bucket: string,
  prefix: string,
): Promise<number> {
  let removed = 0;

  async function walk(dir: string): Promise<void> {
    const filePaths: string[] = [];
    const subDirs: string[] = [];

    // Listing dirampungkan dulu sebelum delete agar offset pagination stabil.
    for (let offset = 0; ; offset += 500) {
      const { data: entries, error } = await admin.storage
        .from(bucket)
        .list(dir, { limit: 500, offset });
      if (error || !entries || entries.length === 0) break;

      for (const entry of entries) {
        if (entry.id === null) {
          subDirs.push(entry.name);
          continue;
        }
        if (entry.name !== ".emptyFolderPlaceholder") {
          filePaths.push(`${dir}/${entry.name}`);
        }
      }
      if (entries.length < 500) break;
    }

    if (filePaths.length > 0) {
      const { error: rmError } = await admin.storage.from(bucket).remove(filePaths);
      if (!rmError) removed += filePaths.length;
    }

    for (const sub of subDirs) {
      await walk(`${dir}/${sub}`);
    }
  }

  await walk(prefix);
  return removed;
}

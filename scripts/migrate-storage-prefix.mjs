// Migrasi sekali jalan (2026-08-26): relokasi key storage yang menyertakan
// prefix nama bucket DI DALAM bucket-nya sendiri menjadi key relatif bucket
// (konvensi database.md §6). Fix bug: thumb/frame/showcase tidak tampil karena
// URL publik 404 (double-prefix).
//
// Cara pakai: node --env-file=.env.local scripts/migrate-storage-prefix.mjs
// Wajib env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (ada di .env.local).
// Setelah object dipindah, jalankan UPDATE DB via dashboard/SQL (lihat bawah file).

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKETS = ["photos", "thumbs", "frames", "showcase"];

async function walk(bucket, dir) {
  const files = [];
  const dirs = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(dir, { limit: 1000, offset });
    if (error || !data || data.length === 0) break;
    for (const entry of data) {
      const child = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.id === null) {
        dirs.push(child);
      } else if (entry.name !== ".emptyFolderPlaceholder") {
        files.push(child);
      }
    }
    if (data.length < 1000) break;
  }
  for (const d of dirs) {
    files.push(...(await walk(bucket, d)));
  }
  return files;
}

let moved = 0;
let skipped = 0;
let failed = 0;

for (const bucket of BUCKETS) {
  const keys = await walk(bucket, "");
  const prefixed = keys.filter((k) => k.startsWith(`${bucket}/`));
  console.log(`[${bucket}] total=${keys.length} prefixed=${prefixed.length}`);

  for (const oldKey of prefixed) {
    const newKey = oldKey.slice(bucket.length + 1);
    const { data: blob, error: dlErr } = await admin.storage
      .from(bucket)
      .download(oldKey);
    if (dlErr || !blob) {
      console.error(`  ✗ download ${oldKey}: ${dlErr?.message ?? "no data"}`);
      failed++;
      continue;
    }
    const { error: upErr } = await admin.storage
      .from(bucket)
      .upload(newKey, blob, { contentType: blob.type || undefined, upsert: false });
    if (upErr) {
      console.error(`  ✗ upload ${newKey}: ${upErr.message}`);
      failed++;
      continue;
    }
    const { error: rmErr } = await admin.storage.from(bucket).remove([oldKey]);
    if (rmErr) {
      console.error(`  ✗ remove ${oldKey}: ${rmErr.message}`);
      failed++;
      continue;
    }
    console.log(`  ✓ ${oldKey} → ${newKey}`);
    moved++;
  }
}

console.log(`\nSelesai. moved=${moved} skipped=${skipped} failed=${failed}`);

// UPDATE DB berikut (jalankan manual di SQL editor) — PULIHKAN prefix bucket
// di kolom yang dikonsumsi publicStorageUrl (/object/public/{path}):
//   update photos set thumb_path = 'thumbs/' || thumb_path
//     where thumb_path is not null and thumb_path not like 'thumbs/%';
//   update showcase_photos set storage_path = 'showcase/' || storage_path
//     where storage_path not like 'showcase/%';
// Catatan konvensi final (database.md §6):
//   - key objek Storage = relatif bucket, TANPA folder bernama bucket
//   - kolom DB utk public URL (thumb_path, showcase.storage_path, frame_url) =
//     format {bucket}/{key}
//   - storage_path bucket privat (photos) = key apa adanya (signed URL).
// photos.storage_path & events.frame_url TIDAK perlu diubah (sudah konsisten).

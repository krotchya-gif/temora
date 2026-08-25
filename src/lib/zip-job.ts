// Background job ZIP resumable (task 006 §4.1):
// state/progress persisten sebagai objek JSON kecil di bucket 'zips', foto
// mentah di-stage per chunk. Setiap invokasi (POST mulai, GET polling)
// memproses paling satu chunk lalu kembali — aman terhadap timeout/restart
// Vercel Functions; polling lanjutan menyambung dari processed terakhir.
//
// Catatan memori: finalisasi menyusun satu ZIP utuh di RAM (~foto × ukuran).
// Target MVP 500 foto ≈ ratusan MB — masih dalam batas fungsi 1 GB, tapi
// jangan biarkan job menggendong event yang jauh lebih besar tanpa revisi.

import JSZip from "jszip";
import { ulid } from "@/lib/ulid";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export const CHUNK_SIZE = 30;
const LEASE_MS = 90_000;
const SIGNED_URL_SECONDS = 900; // 15 menit (task 006 §2)

export type ZipJobStatus = {
  status: "running" | "done" | "error";
  total: number;
  processed: number;
  /** Epoch ms — klaim eksklusif sederhana antar invokasi bersamaan. */
  leaseUntil: number;
  downloadUrl?: string;
  expiresAt?: string;
  error?: string;
};

// Konvensi path dalam bucket 'zips':
//   {eventId}/jobs/{jobId}.json          — status job
//   {eventId}/{jobId}/{index}.jpg        — staging per foto
//   {eventId}/temora-{slug}-{jobId}.zip  — hasil akhir
function statusPath(eventId: string, jobId: string) {
  return `${eventId}/jobs/${jobId}.json`;
}

function stagingPath(eventId: string, jobId: string, index: number) {
  return `${eventId}/${jobId}/${String(index).padStart(5, "0")}.jpg`;
}

async function writeStatus(
  admin: Admin,
  eventId: string,
  jobId: string,
  status: ZipJobStatus,
) {
  const body = JSON.stringify(status);
  const { error } = await admin.storage
    .from("zips")
    .upload(statusPath(eventId, jobId), body, {
      contentType: "application/json",
      upsert: true,
    });
  if (error) throw new Error(`zip status write: ${error.message}`);
}

export async function getStatus(
  admin: Admin,
  eventId: string,
  jobId: string,
): Promise<ZipJobStatus | null> {
  const { data, error } = await admin.storage
    .from("zips")
    .download(statusPath(eventId, jobId));
  if (error || !data) return null;
  try {
    return JSON.parse(await data.text()) as ZipJobStatus;
  } catch {
    return null;
  }
}

export async function createJob(
  admin: Admin,
  eventId: string,
  total: number,
): Promise<{ jobId: string; status: ZipJobStatus }> {
  const jobId = ulid();
  const status: ZipJobStatus = {
    status: "running",
    total,
    processed: 0,
    leaseUntil: 0,
  };
  await writeStatus(admin, eventId, jobId, status);
  return { jobId, status };
}

/**
 * Proses paling satu chunk (atau finalisasi bila staging lengkap).
 * Selalu return status terkini; aman dipanggil berkali-kali dari polling.
 */
export async function advanceJob(
  admin: Admin,
  opts: { eventId: string; jobId: string; slug: string },
): Promise<ZipJobStatus | null> {
  const { eventId, jobId } = opts;
  const status = await getStatus(admin, eventId, jobId);
  if (!status || status.status !== "running") return status;

  // Invokasi lain sedang memegang lease → cukup laporkan progres.
  if (Date.now() < status.leaseUntil) return status;

  try {
    status.leaseUntil = Date.now() + LEASE_MS;
    await writeStatus(admin, eventId, jobId, status);

    if (status.processed >= status.total) {
      return await finalizeJob(admin, { ...opts, status });
    }

    // Ambil chunk berikutnya — urutan taken_at desc konsisten antar chunk.
    const from = status.processed;
    const { data: rows, error } = await admin
      .from("photos")
      .select("id, storage_path")
      .eq("event_id", eventId)
      .is("deleted_at", null)
      .order("taken_at", { ascending: false })
      .range(from, from + CHUNK_SIZE - 1);
    if (error) throw new Error(`zip query: ${error.message}`);

    let processed = status.processed;
    for (const [i, row] of (rows ?? []).entries()) {
      const { data: blob, error: dlError } = await admin.storage
        .from("photos")
        .download(row.storage_path);
      if (dlError || !blob) continue; // objek hilang → lewati, jangan gagalkan job

      const { error: upError } = await admin.storage
        .from("zips")
        .upload(stagingPath(eventId, jobId, from + i), await blob.arrayBuffer(), {
          contentType: "image/jpeg",
        });
      if (upError) throw new Error(`zip stage: ${upError.message}`);
      processed += 1;
    }

    status.processed = processed;
    status.leaseUntil = 0;
    await writeStatus(admin, eventId, jobId, status);

    if (status.processed >= status.total) {
      return await finalizeJob(admin, { ...opts, status });
    }
    return status;
  } catch (err) {
    status.status = "error";
    status.error =
      err instanceof Error ? err.message : "Gagal menyiapkan ZIP.";
    status.leaseUntil = 0;
    await writeStatus(admin, eventId, jobId, status);
    return status;
  }
}

async function finalizeJob(
  admin: Admin,
  opts: {
    eventId: string;
    jobId: string;
    slug: string;
    status: ZipJobStatus;
  },
): Promise<ZipJobStatus> {
  const { eventId, jobId, slug, status } = opts;

  const zip = new JSZip();
  for (let i = 0; i < status.total; i++) {
    const { data, error } = await admin.storage
      .from("zips")
      .download(stagingPath(eventId, jobId, i));
    if (error || !data) continue; // baris dilewati saat staging → nomor bolong
    zip.file(`momen-${String(i + 1).padStart(4, "0")}.jpg`, await data.arrayBuffer());
  }

  // JPEG sudah terkompres — STORE cepat & tanpa untung-untungan CPU.
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "STORE" });

  const finalPath = `${eventId}/temora-${slug}-${jobId}.zip`;
  const { error: upError } = await admin.storage
    .from("zips")
    .upload(finalPath, buffer, {
      contentType: "application/zip",
      upsert: true,
    });
  if (upError) throw new Error(`zip final upload: ${upError.message}`);

  const { data: signed, error: signError } = await admin.storage
    .from("zips")
    .createSignedUrl(finalPath, SIGNED_URL_SECONDS);
  if (signError || !signed) throw new Error(`zip sign: ${signError?.message}`);

  // Bersihkan staging setelah ZIP final aman tersimpan.
  const staging = Array.from({ length: status.total }, (_, i) =>
    stagingPath(eventId, jobId, i),
  );
  await admin.storage.from("zips").remove(staging);

  const done: ZipJobStatus = {
    ...status,
    status: "done",
    downloadUrl: signed.signedUrl,
    expiresAt: new Date(Date.now() + SIGNED_URL_SECONDS * 1000).toISOString(),
  };
  await writeStatus(admin, eventId, jobId, done);
  return done;
}

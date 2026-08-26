import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { isJpegBuffer } from "@/lib/security";
import { allowRequest, getClientIp } from "@/lib/rate-limit";
import { enqueueWa } from "@/lib/whatsapp";
import { ulid } from "@/lib/ulid";
import {
  MAX_UPLOAD_BYTES,
  uploadSchema,
} from "@/lib/validation/photobooth";

export const runtime = "nodejs";

const RATE_LIMIT_PER_MINUTE = 12;

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function findByClientUploadId(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  clientUploadId: string,
) {
  const { data } = await admin
    .from("photos")
    .select("id, metadata")
    .eq("event_id", eventId)
    .is("deleted_at", null)
    .filter("metadata->>client_upload_id", "eq", clientUploadId)
    .maybeSingle();
  return data;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { eventId } = await params;

  const form = await request.formData().catch(() => null);
  if (!form) return jsonError("Data tidak lengkap.", 400);

  const image = form.get("image");
  const parsed = uploadSchema.safeParse({
    tableId: form.get("tableId"),
    clientUploadId: form.get("clientUploadId"),
    width: form.get("width") || undefined,
    height: form.get("height") || undefined,
  });

  if (!(image instanceof File) || !parsed.success) {
    return jsonError("Data tidak lengkap.", 400);
  }
  if (image.type !== "image/jpeg" || image.size < 1024 || image.size > MAX_UPLOAD_BYTES) {
    return jsonError("Format foto tidak didukung.", 415);
  }

  // Magic-byte check — deklarasi MIME client bisa palsu (task 019 §2.3).
  const imageBuffer = Buffer.from(await image.arrayBuffer());
  if (!isJpegBuffer(imageBuffer)) {
    return jsonError("Format foto tidak didukung.", 415);
  }

  const { tableId, clientUploadId, width, height } = parsed.data;

  // Guard kedua (defense in depth): validasi penuh di API route, service role bypass RLS.
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("id, vendor_id, name, is_active, expires_at, photo_limit")
    .eq("id", eventId)
    .maybeSingle();

  if (
    !event ||
    !event.is_active ||
    (event.expires_at && new Date(event.expires_at) <= new Date())
  ) {
    return jsonError(
      "Acara ini sudah selesai. Terima kasih sudah jadi bagian dari momennya.",
      404,
    );
  }

  const { data: table } = await admin
    .from("tables")
    .select("id")
    .eq("id", tableId)
    .eq("event_id", event.id)
    .maybeSingle();

  if (!table) {
    return jsonError("Sepertinya tautan ini tidak tepat. Coba scan ulang QR di mejamu, ya.", 404);
  }

  // Rate limit SEBELUM dedup (task 019): query dedup tak lagi jadi jalur
  // bebas-biaya bagi spammer dengan UUID acak. Retry offline manusiawi tetap
  // muat di jendela 12/menit.
  const ipKey = getClientIp(request);
  if (
    !allowRequest(`table:${tableId}`, RATE_LIMIT_PER_MINUTE) ||
    !allowRequest(`ip:${ipKey}`, RATE_LIMIT_PER_MINUTE * 2)
  ) {
    return jsonError(
      "Semangat sekali! Tunggu sebentar ya, lalu lanjut ambil momen berikutnya.",
      429,
    );
  }

  // Dedup: retry offline dengan client_upload_id sama balik foto yang sama.
  const existing = await findByClientUploadId(admin, event.id, clientUploadId);
  if (existing) {
    return NextResponse.json({
      ok: true,
      photoId: existing.id,
      captureToken: existing.metadata?.capture_token ?? null,
      duplicate: true,
    });
  }

  if (event.photo_limit !== null) {
    const { count } = await admin
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .is("deleted_at", null);

    if ((count ?? 0) >= event.photo_limit) {
      return jsonError(
        "Kuota momen acara ini sudah penuh. Terima kasih sudah jadi bagian dari momennya!",
        403,
      );
    }
  }

  // Path convention database.md §6.
  const fileId = ulid();
  const photoPath = `photos/${event.id}/${tableId}/${fileId}.jpg`;
  const thumbPath = `thumbs/${event.id}/${fileId}_320.jpg`;

  const { error: photoError } = await admin.storage
    .from("photos")
    .upload(photoPath, imageBuffer, { contentType: "image/jpeg" });

  if (photoError) {
    console.error("[upload] storage photos:", photoError.message);
    return jsonError("Momen gagal tersimpan. Coba sekali lagi ya.", 502);
  }

  let storedThumbPath: string | null = null;
  const thumb = form.get("thumb");
  if (thumb instanceof File && thumb.size > 0 && thumb.size < 512_000) {
    // Thumbs = bucket PUBLIK — magic byte wajib & content-type dipaksa
    // image/jpeg agar tak bisa ditanam text/html/svg (task 019 §2.3).
    const thumbBuffer = Buffer.from(await thumb.arrayBuffer());
    if (isJpegBuffer(thumbBuffer)) {
      const { error: thumbError } = await admin.storage
        .from("thumbs")
        .upload(thumbPath, thumbBuffer, { contentType: "image/jpeg" });
      if (!thumbError) storedThumbPath = thumbPath;
    }
  }

  const captureToken = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { data: inserted, error: insertError } = await admin
    .from("photos")
    .insert({
      event_id: event.id,
      table_id: tableId,
      storage_path: photoPath,
      thumb_path: storedThumbPath,
      width: width ?? null,
      height: height ?? null,
      size_bytes: imageBuffer.byteLength,
      metadata: {
        capture_token: captureToken,
        client_upload_id: clientUploadId,
      },
    })
    .select("id")
    .single();

  if (insertError) {
    // Race dedup (unique idx_photos_client_upload): row sudah dibuat request lain — kembalikan existing.
    if (insertError.code === "23505") {
      const dup = await findByClientUploadId(admin, event.id, clientUploadId);
      if (dup) {
        return NextResponse.json({
          ok: true,
          photoId: dup.id,
          captureToken: dup.metadata?.capture_token ?? null,
          duplicate: true,
        });
      }
    }

    console.error("[upload] insert photos:", insertError.message);
    await admin.storage.from("photos").remove([photoPath]);
    if (storedThumbPath) await admin.storage.from("thumbs").remove([storedThumbPath]);
    return jsonError("Momen gagal tersimpan. Coba sekali lagi ya.", 500);
  }

  // Milestone 50/100 momen (task 009 — throttled by design).
  const { count: totalPhotos } = await admin
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .is("deleted_at", null);

  if (totalPhotos === 50 || totalPhotos === 100) {
    void enqueueWa(event.vendor_id, "photo_milestone", {
      count: totalPhotos,
      eventName: event.name,
    });
  }

  return NextResponse.json({
    ok: true,
    photoId: inserted.id,
    captureToken,
  });
}

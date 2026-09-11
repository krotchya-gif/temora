import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { isJpegBuffer } from "@/lib/security";
import { allowRequest, getClientIp } from "@/lib/rate-limit";
import { enqueueWa } from "@/lib/whatsapp";
import { ulid } from "@/lib/ulid";
import { deleteStorageFile, uploadStorageFile } from "@/lib/storage";
import {
  MAX_UPLOAD_BYTES,
  uploadSchema,
} from "@/lib/validation/photobooth";

export const runtime = "nodejs";

const RATE_LIMIT_PER_MINUTE = 12;

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
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

  // Key menyertakan area media agar URL publik/private dapat dibedakan.
  const fileId = ulid();
  const photoPath = `photos/${event.id}/${tableId}/${fileId}.jpg`;
  const thumbKey = `thumbs/${event.id}/${fileId}_320.jpg`;

  try {
    await uploadStorageFile(photoPath, imageBuffer, "image/jpeg");
  } catch (error) {
    console.error("[upload] media photos:", error);
    return jsonError("Momen gagal tersimpan. Coba sekali lagi ya.", 502);
  }

  let storedThumbPath: string | null = null;
  const thumb = form.get("thumb");
  if (thumb instanceof File && thumb.size > 0 && thumb.size < 512_000) {
    // Thumbs = bucket PUBLIK — magic byte wajib & content-type dipaksa
    // image/jpeg agar tak bisa ditanam text/html/svg (task 019 §2.3).
    const thumbBuffer = Buffer.from(await thumb.arrayBuffer());
    if (isJpegBuffer(thumbBuffer)) {
      try {
        await uploadStorageFile(thumbKey, thumbBuffer, "image/jpeg");
        storedThumbPath = thumbKey;
      } catch (error) {
        console.error("[upload] media thumb:", error);
      }
    }
  }

  const captureToken = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { data: atomicRows, error: insertError } = await admin.rpc("insert_guest_photo_atomic", {
    p_event_id: event.id,
    p_table_id: tableId,
    p_storage_path: photoPath,
    p_thumb_path: storedThumbPath,
    p_width: width ?? null,
    p_height: height ?? null,
    p_size_bytes: imageBuffer.byteLength,
    p_metadata: {
      capture_token: captureToken,
      client_upload_id: clientUploadId,
    },
  });

  const inserted = Array.isArray(atomicRows) ? atomicRows[0] as { photo_id: string; capture_token: string; duplicate: boolean } | undefined : undefined;

  if (insertError || !inserted) {
    console.error("[upload] atomic insert:", insertError?.message ?? "no row returned");
    await deleteStorageFile(photoPath);
    if (storedThumbPath) await deleteStorageFile(storedThumbPath);
    const errorMessage = insertError?.message ?? "";
    if (errorMessage.includes("quota_exceeded")) return jsonError("Kuota momen acara ini sudah penuh. Terima kasih sudah jadi bagian dari momennya!", 403);
    if (errorMessage.includes("table_not_found")) return jsonError("Sepertinya tautan ini tidak tepat. Coba scan ulang QR di mejamu, ya.", 404);
    if (errorMessage.includes("event_not_available")) return jsonError("Acara ini sudah selesai. Terima kasih sudah jadi bagian dari momennya.", 404);
    return jsonError("Momen gagal tersimpan. Coba sekali lagi ya.", 500);
  }

  if (inserted.duplicate) {
    await deleteStorageFile(photoPath);
    if (storedThumbPath) await deleteStorageFile(storedThumbPath);
    return NextResponse.json({
      ok: true,
      photoId: inserted.photo_id,
      captureToken: inserted.capture_token,
      duplicate: true,
    });
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
    photoId: inserted.photo_id,
    captureToken: inserted.capture_token,
  });
}

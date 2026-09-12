import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { allowRequest, getClientIp } from "@/lib/rate-limit";
import { publicStorageUrl } from "@/lib/storage";
import { momentCreateSchema, sanitizeMomentContent } from "@/lib/validation/moments";

export const runtime = "nodejs";

// Task 012: 1 moment / 60 detik per meja (+ fallback per IP).
const MOMENT_LIMIT = 1;
const MOMENT_WINDOW_MS = 60_000;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

// GET — list moments (vendor). Filter is_hidden opsional: ?hidden=true|false|all.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const supabase = await createClient();

  // RLS e_owner: event milik vendor lain → tidak ditemukan.
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return jsonError("Event tidak ditemukan.", 404);

  const url = new URL(request.url);
  const hiddenParam = url.searchParams.get("hidden");
  const hidden =
    hiddenParam === "true"
      ? true
      : hiddenParam === "false"
        ? false
        : hiddenParam === "all"
          ? "all"
          : undefined;

  const query = supabase
    .from("moments")
    .select(
      "id, event_id, table_id, photo_id, content, is_hidden, created_at, photo:photos(thumb_path, deleted_at)",
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (hidden === true) query.eq("is_hidden", true);
  else if (hidden === false) query.eq("is_hidden", false);
  // hidden="all" → tampilkan semua (feed moderasi vendor, task 012 AC #3).

  const { data, error } = await query;
  if (error) {
    console.error("[moments.list]", error.message);
    return jsonError("Gagal memuat momen.", 500);
  }

  // Feed kartu (design-system §3.10): sertakan thumb foto milik momen agar
  // vendor melihat foto + caption menyatu. Foto terhapus (soft delete) → null.
  const moments = (data ?? []).map((row) => {
    const { photo, ...moment } = row as typeof row & {
      photo: { thumb_path: string | null; deleted_at: string | null } | null;
    };
    return {
      ...moment,
      thumbUrl:
        photo && !photo.deleted_at && photo.thumb_path
          ? publicStorageUrl(photo.thumb_path)
          : null,
    };
  });

  return NextResponse.json({ moments });
}

// POST — tamu kirim moment (anon; jalur utama service role + rate limit).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { eventId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = momentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Tulis momenmu dulu (1–280 karakter).", 400);
  }

  // Rate limit — per meja DAN per IP (pola upload route, defense in depth).
  const ip = getClientIp(request);
  const { tableId, photoId } = parsed.data;
  if (
    !allowRequest(`moment:${eventId}:${tableId}`, MOMENT_LIMIT, MOMENT_WINDOW_MS) ||
    !allowRequest(`moment-ip:${ip}:${eventId}`, MOMENT_LIMIT, MOMENT_WINDOW_MS)
  ) {
    return jsonError(
      "Satu momen cukup, biar momen lainnya kebagian. Tunggu sebentar ya.",
      429,
    );
  }

  const admin = createAdminClient();
  const content = sanitizeMomentContent(parsed.data.content);
  if (!content) return jsonError("Tulis momenmu dulu, ya.", 400);

  // Validasi event aktif + belum expired + table milik event (database.md §2.7).
  const { data: event } = await admin
    .from("events")
    .select("id, is_active, expires_at")
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
    .eq("event_id", eventId)
    .maybeSingle();
  if (!table) return jsonError("Tautan meja tidak valid.", 404);

  // photo_id (opsional) harus milik event yang sama.
  if (photoId) {
    const { data: photo } = await admin
      .from("photos")
      .select("id")
      .eq("id", photoId)
      .eq("event_id", eventId)
      .maybeSingle();
    if (!photo) return jsonError("Foto tidak ditemukan.", 404);
  }

  const { data, error } = await admin
    .from("moments")
    .insert({
      event_id: eventId,
      table_id: tableId,
      photo_id: photoId ?? null,
      content,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[moments.create]", error?.message);
    return jsonError("Momen belum tersimpan. Coba sekali lagi ya.", 500);
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
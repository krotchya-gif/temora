import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicStorageUrl } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_FRAME_BYTES = 8 * 1024 * 1024;
const MIN_SIDE = 480;
const MAX_SIDE = 2560;

type PngInfo = {
  width: number;
  height: number;
  hasAlpha: boolean;
};

/**
 * Parse IHDR + potongan awal chunk PNG untuk cek dimensi & transparansi.
 * colorType: 6=RGBA, 4=gray+alpha; palet (3) dianggap transparan bila ada tRNS.
 */
function parsePng(buffer: Buffer): PngInfo | null {
  if (
    buffer.length < 33 ||
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47
  ) {
    return null;
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const colorType = buffer[25];
  if (!width || !height) return null;

  let hasAlpha = colorType === 6 || colorType === 4;

  // Scan chunk types (offset 12: len,type,...) sampai IDAT — cari tRNS utk palet.
  let offset = 8;
  while (offset + 8 <= Math.min(buffer.length, 200_000)) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") break;
    if (type === "tRNS") {
      hasAlpha = true;
      break;
    }
    offset += 12 + length; // 4 len + 4 type + data + 4 crc
  }

  return { width, height, hasAlpha };
}

// POST /api/events/[eventId]/frame — upload frame PNG transparan (task 007).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { eventId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  // RLS e_owner.
  const { data: event } = await supabase
    .from("events")
    .select("id, vendor_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) {
    return NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("frame");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "File harus PNG transparan, ukurannya maksimal 8 MB." },
      { status: 400 },
    );
  }

  if (file.type !== "image/png" || file.size < 1024 || file.size > MAX_FRAME_BYTES) {
    return NextResponse.json(
      { error: "File harus PNG transparan, ukurannya maksimal 8 MB." },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const png = parsePng(buffer);
  if (!png) {
    return NextResponse.json(
      { error: "File harus PNG transparan, ukurannya maksimal 8 MB." },
      { status: 415 },
    );
  }

  const minSide = Math.min(png.width, png.height);
  const maxSide = Math.max(png.width, png.height);
  if (minSide < MIN_SIDE || maxSide > MAX_SIDE) {
    return NextResponse.json(
      {
        error: `Ukuran frame ${png.width}×${png.height}px. Pakai resolusi antara ${MIN_SIDE}px dan ${MAX_SIDE}px di sisi terpanjang, ya.`,
      },
      { status: 415 },
    );
  }
  if (!png.hasAlpha) {
    return NextResponse.json(
      { error: "Frame-nya belum transparan. Simpan sebagai PNG dengan latar belakang kosong, ya." },
      { status: 415 },
    );
  }

  // Path convention database.md §6 — key relatif bucket frames: {vendor_id}/{event_id}/frame.png.
  // frame_url (DB) = publicStorageUrl berformat {bucket}/{key} → "frames/" + key.
  const key = `${event.vendor_id}/${event.id}/frame.png`;
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from("frames")
    .upload(key, buffer, { contentType: "image/png", upsert: true });

  if (uploadError) {
    console.error("[frame.upload]", uploadError.message);
    return NextResponse.json(
      { error: "Gagal menyimpan frame. Coba sekali lagi ya." },
      { status: 500 },
    );
  }

  const frameUrl = publicStorageUrl(`frames/${key}`);
  const { error: updateError } = await admin
    .from("events")
    .update({ frame_url: frameUrl })
    .eq("id", event.id);

  if (updateError) {
    console.error("[frame.update]", updateError.message);
    return NextResponse.json(
      { error: "Frame tersimpan, tapi gagal dipasang ke event. Coba lagi ya." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, frameUrl });
}

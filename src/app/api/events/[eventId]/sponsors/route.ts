import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { deleteStorageFile, uploadStorageFile } from "@/lib/storage";

export const runtime = "nodejs";

const sponsorCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama sponsor wajib diisi.").max(80),
  position: z.enum(["frame", "qr"]),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const supabase = await createClient();

  // RLS sp_public_read: hanya baris aktif. Tamu tidak butuh event ownership.
  const { data, error } = await supabase
    .from("sponsors")
    .select("id, name, logo_path, position")
    .eq("event_id", eventId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[sponsors.list]", error.message);
    return NextResponse.json({ error: "Gagal memuat sponsor." }, { status: 500 });
  }

  return NextResponse.json({ sponsors: data ?? [] });
}

// POST — tambah sponsor + logo (vendor, TIER PRO only). Multipart: name,
// position, logo (PNG/JPEG opsional).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, vendor_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 });

  // Tier gate (database.md §2.8): hanya Pro — dibaca dari DB, bukan client.
  const { data: vendor } = await supabase
    .from("vendors")
    .select("subscription_tier")
    .eq("id", event.vendor_id)
    .maybeSingle();
  if (vendor?.subscription_tier !== "pro") {
    return NextResponse.json(
      { error: "Fitur sponsor tersedia di paket Pro. Upgrade dulu ya." },
      { status: 403 },
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });

  const parsed = sponsorCreateSchema.safeParse({
    name: form.get("name"),
    position: form.get("position"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const logo = form.get("logo");
  let logoPath: string | null = null;

  const admin = createAdminClient();
  const objectKeyBase = `sponsors/${eventId}/${crypto.randomUUID()}`;
  let objectKey = `${objectKeyBase}.png`;

  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 2_000_000) {
      return NextResponse.json({ error: "Logo maksimal 2 MB." }, { status: 400 });
    }
    const bytes = new Uint8Array(await logo.arrayBuffer());
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!isPng && !isJpeg) {
      return NextResponse.json({ error: "Logo harus PNG atau JPEG." }, { status: 415 });
    }
    objectKey = `${objectKeyBase}.${isPng ? "png" : "jpg"}`;
    try {
      await uploadStorageFile(objectKey, bytes, isPng ? "image/png" : "image/jpeg");
    } catch (error) {
      console.error("[sponsors.upload]", error);
      return NextResponse.json({ error: "Logo belum tersimpan. Coba lagi ya." }, { status: 500 });
    }
    logoPath = objectKey;
  }

  const { data, error } = await admin
    .from("sponsors")
    .insert({
      event_id: eventId,
      name: parsed.data.name,
      logo_path: logoPath,
      position: parsed.data.position,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[sponsors.create]", error?.message);
    if (logoPath) {
      await deleteStorageFile(objectKey);
    }
    return NextResponse.json({ error: "Sponsor belum tersimpan." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

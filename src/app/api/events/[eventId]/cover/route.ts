import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isImageBuffer, isSameOrigin } from "@/lib/security";
import { deleteStorageFile, publicStorageUrl, uploadStorageFile } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_COVER_BYTES = 4 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });

  const { data: event } = await supabase
    .from("events")
    .select("id, vendor_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("cover");
  if (!(file instanceof File) || !TYPES.has(file.type) || file.size < 1024 || file.size > MAX_COVER_BYTES) {
    return NextResponse.json({ error: "Foto cover harus JPG atau PNG, maksimal 4 MB." }, { status: 415 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isImageBuffer(bytes)) {
    return NextResponse.json(
      { error: "File cover tampak bukan gambar yang valid. Coba file lain ya." },
      { status: 415 },
    );
  }

  const extension = file.type === "image/png" ? "png" : "jpg";
  const key = `covers/${event.vendor_id}/${event.id}/cover.${extension}`;
  try {
    await uploadStorageFile(key, bytes, file.type);
    const admin = createAdminClient();
    const { error } = await admin.from("events").update({ cover_image_url: publicStorageUrl(key) }).eq("id", event.id);
    if (error) throw error;
    return NextResponse.json({ ok: true, coverImageUrl: publicStorageUrl(key) });
  } catch (error) {
    console.error("[cover.upload]", error);
    // Jangan tinggalkan file yatim bila update DB gagal setelah upload sukses.
    await deleteStorageFile(key).catch(() => {});
    return NextResponse.json({ error: "Gagal menyimpan foto cover. Coba lagi ya." }, { status: 500 });
  }
}

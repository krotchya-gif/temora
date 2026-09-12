import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { downloadStorageFile } from "@/lib/storage";
import { renderPolaroid } from "@/lib/polaroid";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string; photoId: string }> },
) {
  const { eventId, photoId } = await params;
  const supabase = await createClient();
  const [{ data: event }, { data: photo }] = await Promise.all([
    supabase.from("events").select("id, name").eq("id", eventId).maybeSingle(),
    supabase
      .from("photos")
      .select("id, storage_path")
      .eq("id", photoId)
      .eq("event_id", eventId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);
  if (!event || !photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const source = await downloadStorageFile(photo.storage_path);
    const card = await renderPolaroid({ image: source.bytes, eventName: event.name });
    return new NextResponse(new Uint8Array(card), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="momen-${photo.id}.jpg"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[photo.polaroid]", error);
    return NextResponse.json({ error: "Polaroid belum bisa dibuat." }, { status: 500 });
  }
}

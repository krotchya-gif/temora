import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { downloadStorageFile } from "@/lib/storage";
import { renderPolaroid } from "@/lib/polaroid";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string; momentId: string }> },
) {
  const { eventId, momentId } = await params;
  const supabase = await createClient();
  const [{ data: event }, { data: rawMoment }] = await Promise.all([
    supabase.from("events").select("id, name").eq("id", eventId).maybeSingle(),
    supabase
      .from("moments")
      .select("id, content, is_hidden, photo:photos(storage_path, deleted_at)")
      .eq("id", momentId)
      .eq("event_id", eventId)
      .maybeSingle(),
  ]);
  if (!event || !rawMoment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const moment = rawMoment as unknown as {
    id: string;
    content: string;
    is_hidden: boolean;
    photo: { storage_path: string; deleted_at: string | null } | null;
  };
  if (moment.is_hidden) {
    return NextResponse.json(
      { error: "Momen tersembunyi tidak ikut unduhan." },
      { status: 409 },
    );
  }

  try {
    const image =
      moment.photo && !moment.photo.deleted_at
        ? (await downloadStorageFile(moment.photo.storage_path)).bytes
        : null;
    const card = await renderPolaroid({
      image,
      eventName: event.name,
      caption: moment.content,
    });
    return new NextResponse(new Uint8Array(card), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="momen-${moment.id}.jpg"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[moment.polaroid]", error);
    return NextResponse.json({ error: "Polaroid belum bisa dibuat." }, { status: 500 });
  }
}

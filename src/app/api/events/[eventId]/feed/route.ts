import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decodeMomentCursor, loadMomentFeed } from "@/lib/moment-feed";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) {
    return NextResponse.json({ error: "Event tidak ditemukan." }, { status: 404 });
  }

  const url = new URL(request.url);
  const rawCursor = url.searchParams.get("cursor");
  const cursor = decodeMomentCursor(rawCursor);
  if (rawCursor && !cursor) {
    return NextResponse.json({ error: "Cursor tidak valid." }, { status: 400 });
  }

  try {
    const page = await loadMomentFeed(supabase, eventId, {
      cursor,
      limit: Number(url.searchParams.get("limit")) || 20,
    });
    return NextResponse.json(page);
  } catch (error) {
    console.error("[moment-feed]", error);
    return NextResponse.json(
      { error: "Momen belum bisa dimuat. Coba sekali lagi ya." },
      { status: 500 },
    );
  }
}

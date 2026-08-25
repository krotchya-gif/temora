import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicStorageUrl } from "@/lib/storage";

export const runtime = "nodejs";

const PAGE_SIZE_MAX = 50;

// GET /api/events/[id]/photos?offset=0&limit=20 — list galeri vendor (task 006).
// RLS p_owner_all menjamin hanya event milik vendor.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(
    PAGE_SIZE_MAX,
    Number(url.searchParams.get("limit")) || 20,
  );
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  // Embed to-one via FK table_id; bentuk runtime object, tipe SDK longgar → cast lokal.
  type PhotoRow = {
    id: string;
    thumb_path: string | null;
    width: number | null;
    height: number | null;
    taken_at: string;
    tables: { label: string } | null;
  };

  const { data, count, error } = await supabase
    .from("photos")
    .select("id, thumb_path, width, height, taken_at, tables(label)", {
      count: "exact",
    })
    .eq("event_id", eventId)
    .is("deleted_at", null)
    .order("taken_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[photos.list]", error.message);
    return NextResponse.json(
      { error: "Gagal memuat momen. Coba muat ulang." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    total: count ?? 0,
    photos: ((data ?? []) as unknown as PhotoRow[]).map((row) => ({
      id: row.id,
      thumbUrl: row.thumb_path ? publicStorageUrl(row.thumb_path) : null,
      width: row.width,
      height: row.height,
      tableLabel: row.tables?.label ?? null,
      takenAt: row.taken_at,
    })),
  });
}

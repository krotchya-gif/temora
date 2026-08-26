import { NextResponse } from "next/server";
import { z } from "zod";
import { getSuperAdminOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";

const swapSchema = z.object({
  photoId: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

// POST — naik/turun urutan kartu showcase (swap sort_order dengan tetangga).
export async function POST(request: Request) {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = swapSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: all, error } = await admin
    .from("showcase_photos")
    .select("id, sort_order")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !all) {
    return NextResponse.json({ error: "Gagal memuat urutan." }, { status: 500 });
  }

  const idx = all.findIndex((r) => r.id === parsed.data.photoId);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const neighborIdx = parsed.data.direction === "up" ? idx - 1 : idx + 1;
  if (neighborIdx < 0 || neighborIdx >= all.length) {
    return NextResponse.json({ ok: true }); // sudah di ujung — no-op
  }

  // Tukar posisi di array lalu tulis ulang sort_order berurutan (stabil).
  const reordered = [...all];
  [reordered[idx], reordered[neighborIdx]] = [
    reordered[neighborIdx],
    reordered[idx],
  ];

  await Promise.all(
    reordered.map((row, i) =>
      admin
        .from("showcase_photos")
        .update({ sort_order: i + 1 })
        .eq("id", row.id),
    ),
  );

  await logAdminAction({
    actorId: actor.id,
    actorEmail: actor.email ?? "",
    action: "showcase_edit",
    targetType: "photo",
    targetId: parsed.data.photoId,
    detail: { reorder: parsed.data.direction },
  });

  return NextResponse.json({ ok: true });
}

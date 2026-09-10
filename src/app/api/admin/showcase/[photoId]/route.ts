import { NextResponse } from "next/server";
import { z } from "zod";
import { getSuperAdminOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";
import { deleteStorageFile } from "@/lib/storage";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  caption: z.string().trim().max(280).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100_000).optional(),
});

// PATCH — edit judul/kutipan/urutan.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { photoId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const patch = Object.fromEntries(
    Object.entries(parsed.data)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k === "sortOrder" ? "sort_order" : k, v]),
  );
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("showcase_photos")
    .update(patch)
    .eq("id", photoId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await logAdminAction({
    actorId: actor.id,
    actorEmail: actor.email ?? "",
    action: "showcase_edit",
    targetType: "photo",
    targetId: photoId,
    detail: { fields: Object.keys(patch) },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — soft delete row + purge objek storage langsung (konten publik).
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { photoId } = await params;
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("showcase_photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await admin
    .from("showcase_photos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", photoId);

  if (error) {
    console.error("[admin] showcase delete:", error.message);
    return NextResponse.json({ error: "Gagal menghapus." }, { status: 500 });
  }

  await deleteStorageFile(row.storage_path);

  await logAdminAction({
    actorId: actor.id,
    actorEmail: actor.email ?? "",
    action: "showcase_delete",
    targetType: "photo",
    targetId: photoId,
    detail: { path: row.storage_path },
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSuperAdminOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";
import { isImageBuffer, isPngBuffer } from "@/lib/security";
import { ulid } from "@/lib/ulid";
import { deleteStorageFile, uploadStorageFile } from "@/lib/storage";

export const runtime = "nodejs";
const MAX_BYTES = 10 * 1024 * 1024;

const patchSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  caption: z.string().trim().max(280).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100_000).optional(),
});

// PATCH — edit gambar/judul/kutipan/urutan. Multipart dipakai saat ada file;
// JSON tetap didukung untuk kompatibilitas pemanggil lama.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { photoId } = await params;
  const contentType = request.headers.get("content-type") ?? "";
  let replacement: File | null = null;
  let body: unknown;
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
    }
    const file = form.get("file");
    replacement = file instanceof File && file.size > 0 ? file : null;
    body = {
      title: String(form.get("title") ?? "").trim() || undefined,
      caption: String(form.get("caption") ?? "").trim() || null,
    };
  } else {
    body = await request.json().catch(() => null);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const patch = Object.fromEntries(
    Object.entries(parsed.data)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k === "sortOrder" ? "sort_order" : k, v]),
  );
  if (Object.keys(patch).length === 0 && !replacement) {
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: current, error: currentError } = await admin
    .from("showcase_photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .is("deleted_at", null)
    .maybeSingle();
  if (currentError) {
    console.error("[admin] showcase lookup:", currentError.message);
    return NextResponse.json({ error: "Gagal membaca data showcase." }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let newKey: string | null = null;
  if (replacement) {
    if (replacement.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Foto lebih dari 10MB. Kompres dulu ya." },
        { status: 415 },
      );
    }
    if (replacement.size < 1024) {
      return NextResponse.json(
        { error: "File terlalu kecil — pastikan itu foto yang benar." },
        { status: 415 },
      );
    }

    const buffer = Buffer.from(await replacement.arrayBuffer());
    if (!isImageBuffer(buffer)) {
      return NextResponse.json({ error: "Format tidak didukung." }, { status: 415 });
    }
    const png = isPngBuffer(buffer);
    const replacementType = png ? "image/png" : "image/jpeg";
    newKey = `showcase/${ulid()}.${png ? "png" : "jpg"}`;
    try {
      await uploadStorageFile(newKey, buffer, replacementType);
    } catch (error) {
      console.error("[admin] showcase replacement upload:", error);
      return NextResponse.json({ error: "Upload gambar pengganti gagal." }, { status: 502 });
    }
    patch.storage_path = newKey;
    patch.external_url = null;
  }

  const { data, error } = await admin
    .from("showcase_photos")
    .update(patch)
    .eq("id", photoId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    if (newKey) await deleteStorageFile(newKey);
    console.error("[admin] showcase edit:", error?.message);
    return NextResponse.json({ error: "Perubahan gagal disimpan." }, { status: 500 });
  }

  let cleanupWarning = false;
  if (newKey && current.storage_path && current.storage_path !== newKey) {
    cleanupWarning = !(await deleteStorageFile(current.storage_path));
  }

  await logAdminAction({
    actorId: actor.id,
    actorEmail: actor.email ?? "",
    action: "showcase_edit",
    targetType: "photo",
    targetId: photoId,
    detail: {
      fields: Object.keys(patch),
      previousPath: newKey ? current.storage_path : undefined,
      newPath: newKey ?? undefined,
      cleanupWarning,
    },
  });

  return NextResponse.json({
    ok: true,
    warning: cleanupWarning ? "Gambar tersimpan, tetapi file lama belum terhapus." : undefined,
  });
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

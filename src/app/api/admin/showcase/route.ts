import { NextResponse } from "next/server";
import { getSuperAdminOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";
import { isImageBuffer } from "@/lib/security";
import { ulid } from "@/lib/ulid";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

// POST — upload foto kurasi (multipart: file + title + caption?) (docs/qa-report.md §7).
export async function POST(request: Request) {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const title = String(form?.get("title") ?? "").trim();
  const caption = String(form?.get("caption") ?? "").trim();

  if (!form || !(file instanceof File) || !title) {
    return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Foto lebih dari 10MB. Kompres dulu ya." },
      { status: 415 },
    );
  }
  if (file.size < 1024) {
    return NextResponse.json(
      { error: "File terlalu kecil — pastikan itu foto yang benar." },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isImageBuffer(buffer)) {
    return NextResponse.json({ error: "Format tidak didukung." }, { status: 415 });
  }
  const contentType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const ext = contentType === "image/png" ? "png" : "jpg";
  // Key relatif bucket showcase (tanpa folder "showcase/"); storage_path DB
  // berformat {bucket}/{key} agar moments.ts (/object/public/{storage_path}) benar.
  const key = `${ulid()}.${ext}`;

  const admin = createAdminClient();
  const { error: upError } = await admin.storage
    .from("showcase")
    .upload(key, buffer, { contentType });

  if (upError) {
    console.error("[admin] showcase upload:", upError.message);
    return NextResponse.json({ error: "Upload gagal." }, { status: 502 });
  }

  // sort_order = max saat ini + 1 → muncul paling awal (urut asc dibaca dulu).
  const { data: last } = await admin
    .from("showcase_photos")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await admin
    .from("showcase_photos")
    .insert({
      storage_path: `showcase/${key}`,
      title,
      caption: caption || null,
      sort_order: (last?.sort_order ?? 0) + 1,
      created_by: actor.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[admin] showcase insert:", error?.message);
    await admin.storage.from("showcase").remove([key]);
    return NextResponse.json({ error: "Gagal menyimpan." }, { status: 500 });
  }

  await logAdminAction({
    actorId: actor.id,
    actorEmail: actor.email ?? "",
    action: "showcase_upload",
    targetType: "photo",
    targetId: data.id,
    detail: { title, path: `showcase/${key}` },
  });

  return NextResponse.json({ ok: true, id: data.id });
}

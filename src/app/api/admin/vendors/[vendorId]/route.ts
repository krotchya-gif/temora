import { NextResponse } from "next/server";
import { z } from "zod";
import { getSuperAdminOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";
import { removePrefix } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const editSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  company_name: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  wa_opt_in: z.boolean().optional(),
});

// PATCH — edit profil vendor (task 019).
// Email TIDAK lewat sini (butuh sinkron auth.users); kolom lain aman.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { vendorId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const patch = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vendors")
    .update(patch)
    .eq("id", vendorId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[admin] edit_vendor:", error?.message ?? "tidak ditemukan");
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await logAdminAction({
    actorId: actor.id,
    actorEmail: actor.email ?? "",
    action: "edit_vendor",
    targetType: "vendor",
    targetId: vendorId,
    detail: { fields: Object.keys(patch) },
  });

  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({
  confirmEmail: z.string().trim().toLowerCase(),
});

// DELETE — HAPUS PERMANEN vendor (task 019). Urutan aman:
// audit SEBELUM eksekusi → purge Storage semua event & frames vendor →
// delete baris vendors (kascade) → delete auth user. Tak dapat dibatalkan.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (actor.id === (await params).vendorId) {
    return NextResponse.json(
      { error: "Tidak bisa menghapus akun sendiri." },
      { status: 400 },
    );
  }

  const { vendorId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: vendor } = await admin
    .from("vendors")
    .select("id, email, name")
    .eq("id", vendorId)
    .maybeSingle();

  if (!vendor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (vendor.email.toLowerCase() !== parsed.data.confirmEmail) {
    return NextResponse.json(
      { error: "Email konfirmasi tidak cocok." },
      { status: 400 },
    );
  }

  // Jejak audit harus ada walau langkah berikutnya gagal separuh jalan.
  await logAdminAction({
    actorId: actor.id,
    actorEmail: actor.email ?? "",
    action: "delete_vendor",
    targetType: "vendor",
    targetId: vendorId,
    detail: { email: vendor.email, name: vendor.name },
  });

  // 1. Purge seluruh objek Storage milik vendor.
  const { data: events } = await admin
    .from("events")
    .select("id")
    .eq("vendor_id", vendorId);

  for (const event of events ?? []) {
    for (const prefix of [
      `photos/${event.id}`,
      `thumbs/${event.id}`,
      `zips/${event.id}`,
      `frames/${vendorId}/${event.id}`,
    ]) {
      const removed = await removePrefix(
        admin,
        prefix.split("/")[0],
        prefix,
      );
      if (removed > 0) {
        console.info(`[admin] purge ${prefix}: ${removed} objek`);
      }
    }
  }

  // 2. Hapus baris vendors → cascade events/photos/subscriptions/wa_logs.
  const { error: dbError } = await admin
    .from("vendors")
    .delete()
    .eq("id", vendorId);
  if (dbError) {
    console.error("[admin] delete_vendor db:", dbError.message);
    return NextResponse.json(
      { error: "Gagal menghapus data vendor." },
      { status: 500 },
    );
  }

  // 3. Hapus akun auth.
  const { error: authError } = await admin.auth.admin.deleteUser(vendorId);
  if (authError) {
    console.error("[admin] delete_vendor auth:", authError.message);
    return NextResponse.json({
      ok: true,
      warning: "Data terhapus tapi akun auth masih ada — cek manual.",
    });
  }

  return NextResponse.json({ ok: true });
}

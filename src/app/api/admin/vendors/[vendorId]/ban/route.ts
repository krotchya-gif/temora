import { NextResponse } from "next/server";
import { z } from "zod";
import { getSuperAdminOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";

const banSchema = z.object({
  banned: z.boolean(),
});

// POST /api/admin/vendors/[vendorId]/ban — ban/unban vendor (task 019 §2.12).
// Ban = tolak login baru + blokir sesi hidup (guard proxy/layout/login) +
// AUTO-NONAKTIFKAN semua event vendor (keputusan pemilik). Data tidak disentuh.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (actor.id === (await params).vendorId) {
    // Mencegah admin membekukan dirinya sendiri.
    return NextResponse.json(
      { error: "Tidak bisa mem-ban akun sendiri." },
      { status: 400 },
    );
  }

  const { vendorId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = banSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const admin = createAdminClient();
  const bannedAt = parsed.data.banned ? new Date().toISOString() : null;

  const { data, error } = await admin
    .from("vendors")
    .update({ banned_at: bannedAt })
    .eq("id", vendorId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[admin] ban_vendor:", error?.message ?? "tidak ditemukan");
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.banned) {
    // Auto-nonaktifkan seluruh event milik vendor yang dibanned.
    const { error: evError } = await admin
      .from("events")
      .update({ is_active: false })
      .eq("vendor_id", vendorId)
      .eq("is_active", true);
    if (evError) {
      console.error("[admin] ban_vendor events:", evError.message);
    }
  }

  await logAdminAction({
    actorId: actor.id,
    actorEmail: actor.email ?? "",
    action: parsed.data.banned ? "ban_vendor" : "unban_vendor",
    targetType: "vendor",
    targetId: vendorId,
    detail: { deactivatedEvents: parsed.data.banned },
  });

  return NextResponse.json({ ok: true });
}

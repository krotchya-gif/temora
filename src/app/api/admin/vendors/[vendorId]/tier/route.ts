import { NextResponse } from "next/server";
import { z } from "zod";
import { getSuperAdminOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const tierSchema = z.object({
  tier: z.enum(["free", "basic", "pro"]),
});

// PUT /api/admin/vendors/[vendorId]/tier — set paket vendor (task 018).
// Catatan desain: photo_limit event lama tidak tersentuh (keputusan terkunci
// #13) — perubahan hanya berpengaruh ke event yang dibuat setelahnya.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { vendorId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = tierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vendors")
    .update({ subscription_tier: parsed.data.tier })
    .eq("id", vendorId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[admin] set_tier:", error?.message ?? "vendor tidak ditemukan");
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Audit trail via log terstruktur (Vercel Logs) — tanpa tabel baru.
  console.info(
    "[admin]",
    JSON.stringify({
      action: "set_tier",
      actor: actor.id,
      vendorId,
      tier: parsed.data.tier,
    }),
  );

  return NextResponse.json({ ok: true });
}

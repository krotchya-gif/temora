import { NextResponse } from "next/server";
import { z } from "zod";
import { getSuperAdminOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const statusSchema = z.object({
  isActive: z.boolean(),
});

// PATCH /api/admin/events/[eventId]/status — moderasi status event (task 018).
// Nonaktif memutus akses tamu di dua lapis sekaligus: API route upload dan
// RLS e_public_read/t_public_read/p_guest_insert yang mensyaratkan is_active.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { eventId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("events")
    .update({ is_active: parsed.data.isActive })
    .eq("id", eventId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[admin] set_event_status:", error?.message ?? "event tidak ditemukan");
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  console.info(
    "[admin]",
    JSON.stringify({
      action: "set_event_status",
      actor: actor.id,
      eventId,
      isActive: parsed.data.isActive,
    }),
  );

  return NextResponse.json({ ok: true });
}

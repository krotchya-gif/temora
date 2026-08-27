import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export const runtime = "nodejs";

const sponsorUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  position: z.enum(["frame", "qr"]).optional(),
  isActive: z.boolean().optional(),
});

// PATCH — edit nama/posisi/status sponsor; DELETE — hapus (purge logo).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string; sponsorId: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { eventId, sponsorId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = sponsorUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const supabase = await createClient();

  // RLS sp_owner_all + e_owner: sponsor milik event vendor lain = tidak ada.
  const changes: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) changes.name = parsed.data.name;
  if (parsed.data.position !== undefined) changes.position = parsed.data.position;
  if (parsed.data.isActive !== undefined) changes.is_active = parsed.data.isActive;

  const { data, error } = await supabase
    .from("sponsors")
    .update(changes)
    .eq("id", sponsorId)
    .eq("event_id", eventId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[sponsors.update]", error.message);
    return NextResponse.json({ error: "Gagal memperbarui sponsor." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Sponsor tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string; sponsorId: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { eventId, sponsorId } = await params;
  const supabase = await createClient();

  const { data: sponsor, error: findErr } = await supabase
    .from("sponsors")
    .select("id, logo_path")
    .eq("id", sponsorId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (findErr) {
    console.error("[sponsors.find]", findErr.message);
    return NextResponse.json({ error: "Gagal menghapus sponsor." }, { status: 500 });
  }
  if (!sponsor) {
    return NextResponse.json({ error: "Sponsor tidak ditemukan." }, { status: 404 });
  }

  const { error } = await supabase.from("sponsors").delete().eq("id", sponsor.id);
  if (error) {
    console.error("[sponsors.delete]", error.message);
    return NextResponse.json({ error: "Gagal menghapus sponsor." }, { status: 500 });
  }

  // Purge objek logo (database.md §9.5) bila ada.
  if (sponsor.logo_path) {
    const objectKey = sponsor.logo_path.replace(/^sponsors\//, "");
    const admin = createAdminClient();
    await admin.storage.from("sponsors").remove([objectKey]).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
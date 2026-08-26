import { NextResponse } from "next/server";
import { getSuperAdminOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";

type RetryProps = {
  params: Promise<{ eventId: string }>;
};

// POST /api/admin/events/[eventId]/retry — tandai event sebagai terkirim
// (retry manual — referensi seo.md §4.4).
export async function POST(_request: Request, { params }: RetryProps) {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { eventId } = await params;

  const { error } = await createAdminClient()
    .from("event_logs")
    .update({ status: "sent" })
    .eq("id", eventId);

  if (error) {
    return NextResponse.json({ error: "Gagal update." }, { status: 500 });
  }

  await logAdminAction({
    actorId: actor.id,
    actorEmail: actor.email ?? "",
    action: "event_retry",
    targetType: "vendor",
    targetId: null,
    detail: { eventId },
  });

  return NextResponse.json({ ok: true });
}
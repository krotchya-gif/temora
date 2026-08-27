import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";

const hideSchema = z.object({ isHidden: z.boolean() });

// PATCH — moderasi vendor: hide/show moment (task 012 AC #3).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string; momentId: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { eventId, momentId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = hideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const supabase = await createClient();

  // RLS e_owner + m_owner_all: moment milik event vendor lain = tidak ada.
  const { data, error } = await supabase
    .from("moments")
    .update({ is_hidden: parsed.data.isHidden })
    .eq("id", momentId)
    .eq("event_id", eventId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[moments.hide]", error.message);
    return NextResponse.json({ error: "Gagal memperbarui momen." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Momen tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
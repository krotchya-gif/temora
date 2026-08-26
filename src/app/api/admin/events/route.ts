import { NextResponse } from "next/server";
import { getSuperAdminOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// GET /api/admin/events — 100 event konversi marketing terakhir (tab Event Monitor).
export async function GET() {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data } = await createAdminClient()
    .from("event_logs")
    .select("id, event_name, label, page, value, status, provider, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ events: data ?? [] });
}
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

  const { data, error } = await createAdminClient()
    .from("event_logs")
    .select("id, event_name, label, page, value, status, provider, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[admin] events:", error.message);
    return NextResponse.json({ error: "Gagal membaca data event." }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}
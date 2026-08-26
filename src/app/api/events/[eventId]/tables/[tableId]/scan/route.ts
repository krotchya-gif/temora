import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowRequest, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Increment scan_count (maks 1× per sesi dijaga sessionStorage di client).
// Atomic via RPC (migrasi 0009) agar scan bersamaan dari banyak tamu tidak
// saling menimpa; limit IP ringan untuk melindungi metrik dari spam.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string; tableId: string }> },
) {
  const { eventId, tableId } = await params;

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!allowRequest(`scan-ip:${getClientIp(request)}`, 30)) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();

  const { data: table } = await admin
    .from("tables")
    .select("id, events!inner(id, is_active, expires_at)")
    .eq("id", tableId)
    .eq("event_id", eventId)
    .maybeSingle();

  const event = table?.events as
    | { id: string; is_active: boolean; expires_at: string | null }
    | undefined;

  if (
    !table ||
    !event ||
    !event.is_active ||
    (event.expires_at && new Date(event.expires_at) <= new Date())
  ) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  // Utama: RPC atomik (migrasi 0009). Fallback read+write bila fungsi belum
  // di-push ke project remote — sedikit rentan lost update, tetap benar secara UX.
  const { error: rpcError } = await admin.rpc("increment_scan_count", {
    p_table_id: tableId,
  });

  if (rpcError) {
    const { data: current } = await admin
      .from("tables")
      .select("scan_count")
      .eq("id", tableId)
      .single();
    const { error } = await admin
      .from("tables")
      .update({ scan_count: (current?.scan_count ?? 0) + 1 })
      .eq("id", tableId);
    if (error) {
      console.error("[scan] update:", error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

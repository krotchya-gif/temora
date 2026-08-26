import { NextResponse } from "next/server";

// GET /api/health — liveness untuk UptimeRobot/CI. Respons sengaja generik:
// status env hanya dicatat server-side agar tak jadi peta rekonesansi (task 019).
export async function GET() {
  const hasSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!hasSupabase) {
    console.error("[health] supabase env missing");
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
}

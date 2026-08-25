import { NextResponse } from "next/server";

export async function GET() {
  const hasSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return NextResponse.json({
    ok: true,
    supabase: hasSupabase ? "configured" : "missing_env",
    timestamp: new Date().toISOString(),
  });
}

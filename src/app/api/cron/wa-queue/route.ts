import { NextResponse } from "next/server";
import { processWaQueue } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron tiap 5 menit (architecture.md §12): kirim antrean WA 'queued'.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const result = await processWaQueue(25);

  // deferred -1 artinya quiet hours — bukan error.
  return NextResponse.json({ ok: true, ...result });
}

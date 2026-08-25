import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueWa } from "@/lib/whatsapp";

export const runtime = "nodejs";

// Cron harian H-3/H-0 (task 008 §2): reminder perpanjangan sebelum
// period_end. Pengiriman nyata + quiet hours ditangani worker task 009.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const admin = createAdminClient();

  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 86_400_000);
  const todayEnd = new Date(now.getTime() + 86_400_000);

  // H-3: period_end dalam [now+2d, now+3d) — jendela hari ke-3 sebelum lewat.
  const { data: h3, error: e1 } = await admin
    .from("subscriptions")
    .select("id, vendor_id, tier, period_end")
    .eq("status", "paid")
    .gte("period_end", new Date(now.getTime() + 2 * 86_400_000).toISOString())
    .lt("period_end", in3Days.toISOString());

  // H-0: jatuh hari ini — [now, now+1d).
  const { data: h0, error: e2 } = await admin
    .from("subscriptions")
    .select("id, vendor_id, tier, period_end")
    .eq("status", "paid")
    .gte("period_end", now.toISOString())
    .lt("period_end", todayEnd.toISOString());

  if (e1 || e2) {
    console.error("[wa-reminders]", e1?.message ?? e2?.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  let queued = 0;
  for (const sub of [...(h3 ?? []), ...(h0 ?? [])]) {
    void enqueueWa(sub.vendor_id, "expiry_reminder", {
      event: "renewal_reminder",
      tier: sub.tier,
      periodEnd: sub.period_end,
      billingUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/billing`,
    });
    queued += 1;
  }

  return NextResponse.json({ ok: true, queued });
}

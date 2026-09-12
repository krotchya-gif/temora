import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCallbackToken } from "@/lib/xendit";

export const runtime = "nodejs";

// POST /api/billing/webhook — konfirmasi pembayaran Xendit (task 008 §4.1).
// Verifikasi x-callback-token; idempoten via status row + unique invoice id.
export async function POST(request: Request) {
  const token = request.headers.get("x-callback-token");
  if (!verifyCallbackToken(token)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        id?: string;
        external_id?: string;
        status?: string;
        paid_amount?: number;
      }
    | null;

  if (!payload?.id) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Audit mentah ke log terstruktur (Vercel Logs) — tanpa tabel tambahan agar
  // skema tetap ramping (database.md §1).
  console.info(
    "[xendit-webhook]",
    JSON.stringify({ id: payload.id, status: payload.status, external_id: payload.external_id }),
  );

  const admin = createAdminClient();

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("id, vendor_id, tier, status")
    .eq("xendit_invoice_id", payload.id)
    .maybeSingle();

  if (!subscription) {
    // Invoice tak dikenal — balas 200 supaya Xendit tidak retry terus.
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (subscription.status === "paid") {
    // Replay webhook → tanpa efek ganda (task 008 acceptance).
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (payload.status === "PAID" || payload.status === "SETTLED") {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 86_400_000);

    const { error } = await admin
      .from("subscriptions")
      .update({
        status: "paid",
        period_start: now.toISOString(),
        period_end: periodEnd.toISOString(),
      })
      .eq("id", subscription.id);
    if (error) {
      console.error("[webhook] update sub:", error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    await admin
      .from("vendors")
      .update({ subscription_tier: subscription.tier })
      .eq("id", subscription.vendor_id);

    // Event konversi marketing (tab Event Monitor — /admin/seo).
    await admin.from("event_logs").insert({
      event_name: "payment_success",
      label: `pembayaran_${subscription.tier}`,
      page: "/dashboard/billing",
      value: { vendor_id: subscription.vendor_id, tier: subscription.tier },
      status: "sent",
      provider: "xendit",
    });

    return NextResponse.json({ ok: true });
  }

  if (payload.status === "EXPIRED") {
    await admin
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("id", subscription.id);
    return NextResponse.json({ ok: true });
  }

  // Status lain (PENDING dll.) — tidak ada aksi.
  return NextResponse.json({ ok: true, ignored: true });
}

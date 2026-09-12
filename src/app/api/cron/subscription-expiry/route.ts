import { NextResponse } from "next/server";
import { timingSafeEqualStr } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Cron harian (architecture.md §12): subscription lewat period_end →
// tandai expired + vendor turun ke free bila tak punya langganan aktif lain.
// Downgrade tidak memblokir event aktif existing (database.md §2.7) —
// pembatasan create/activate sudah ditangani validasi tier di task 007.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || !timingSafeEqualStr(auth ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // 1. Tandai subscription paid yang sudah lewat period_end.
  const { data: expiring, error } = await admin
    .from("subscriptions")
    .select("id, vendor_id")
    .eq("status", "paid")
    .lt("period_end", now);

  if (error) {
    console.error("[sub-expiry] select:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  let expiredCount = 0;
  const affectedVendors = new Set<string>();

  for (const sub of expiring ?? []) {
    const { error: updError } = await admin
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("id", sub.id)
      .eq("status", "paid"); // guard idempoten saat cron dobel jalan

    if (!updError) {
      expiredCount += 1;
      affectedVendors.add(sub.vendor_id);
    }
  }

  // 2. Vendor tanpa langganan paid aktif → turun ke free + notifikasi.
  let downgraded = 0;
  for (const vendorId of affectedVendors) {
    const { count } = await admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId)
      .eq("status", "paid")
      .gt("period_end", now);

    if ((count ?? 0) > 0) continue; // masih ada periode berjalan

    const { error: tierError } = await admin
      .from("vendors")
      .update({ subscription_tier: "free" })
      .eq("id", vendorId);

    if (!tierError) {
      downgraded += 1;
    }
  }

  return NextResponse.json({ ok: true, expiredCount, downgraded });
}

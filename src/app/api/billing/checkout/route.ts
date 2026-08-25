import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createXenditInvoice, isXenditConfigured } from "@/lib/xendit";
import { enqueueWa } from "@/lib/whatsapp";

export const runtime = "nodejs";

const UPGRADE_TIERS = { basic: 99_000, pro: 299_000 } as const;

// POST /api/billing/checkout — buat invoice Xendit utk upgrade tier (task 008).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Silakan login dulu." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const tier = body?.tier;
  if (tier !== "basic" && tier !== "pro") {
    return NextResponse.json(
      { error: "Pilih paket Basic atau Pro dulu ya." },
      { status: 400 },
    );
  }

  const amountIdr = UPGRADE_TIERS[tier as keyof typeof UPGRADE_TIERS];

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, email, subscription_tier")
    .eq("id", user.id)
    .single();

  if (!vendor) {
    return NextResponse.json(
      { error: "Profil vendor tidak ditemukan." },
      { status: 401 },
    );
  }

  if (vendor.subscription_tier === tier) {
    return NextResponse.json(
      { error: `Kamu sudah di paket ${String(tier)}.` },
      { status: 400 },
    );
  }

  // Row pending dulu → external_id = id row (idempoten bila webhook replay).
  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!isXenditConfigured()) {
    return NextResponse.json(
      {
        error:
          "Pembayaran online sedang tidak tersedia. Hubungi kami lewat WhatsApp, ya.",
      },
      { status: 503 },
    );
  }

  const { data: subscription, error: insertError } = await admin
    .from("subscriptions")
    .insert({
      vendor_id: vendor.id,
      tier,
      amount_idr: amountIdr,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !subscription) {
    console.error("[checkout] insert:", insertError?.message);
    return NextResponse.json(
      { error: "Gagal menyiapkan pembayaran. Coba sekali lagi ya." },
      { status: 500 },
    );
  }

  try {
    const invoice = await createXenditInvoice({
      externalId: subscription.id,
      amountIdr,
      description: `TEMORA ${tier === "basic" ? "Basic" : "Pro"} — ${vendor.email}`,
      payerEmail: vendor.email,
      successRedirectUrl: `${appUrl}/dashboard/billing?status=success`,
    });

    const { error: updateError } = await admin
      .from("subscriptions")
      .update({
        xendit_invoice_id: invoice.id,
        xendit_payment_url: invoice.invoice_url,
      })
      .eq("id", subscription.id);

    if (updateError) throw new Error(updateError.message);

    void enqueueWa(vendor.id, "invoice", {
      tier,
      amountIdr,
      paymentUrl: invoice.invoice_url,
    });

    return NextResponse.json({ ok: true, paymentUrl: invoice.invoice_url });
  } catch (err) {
    console.error("[checkout] xendit:", err);
    // Buang row pending tanpa invoice agar riwayat bersih.
    await admin.from("subscriptions").delete().eq("id", subscription.id);
    return NextResponse.json(
      { error: "Pembayaran sedang tidak tersedia. Coba beberapa saat lagi, ya." },
      { status: 502 },
    );
  }
}

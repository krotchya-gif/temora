// Antrean WhatsApp (architecture.md §4.4): enqueue = insert whatsapp_logs
// status 'queued'. Pengiriman + retry oleh worker task 009 (cron wa-queue).
// Tanpa data sensitif — payload hanya nama event / link / nominal.

import { createAdminClient } from "@/lib/supabase/admin";

export type WaKind =
  | "welcome"
  | "event_created"
  | "photo_milestone"
  | "invoice"
  | "payment_ok"
  | "expiry_reminder";

export async function enqueueWa(
  vendorId: string,
  kind: WaKind,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("whatsapp_logs").insert({
      vendor_id: vendorId,
      kind,
      payload,
      status: "queued",
    });
    if (error) {
      console.error("[wa] enqueue:", error.message);
    }
  } catch (err) {
    // Antrean WA tidak boleh memblokir alur utama (checkout/webhook/cron).
    console.error("[wa] enqueue fatal:", err);
  }
}

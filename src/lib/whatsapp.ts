// WhatsApp Business Cloud API (architecture.md §4.4, task 009):
// enqueue = insert whatsapp_logs 'queued' · processQueue mengirim dengan
// retry 1×, quiet hours 22:00–07:00 WIB, throttle 3 pesan/hari/vendor,
// dan opt-out (payment_ok tetap terkirim — pesan kritis).

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

// ---- Normalisasi nomor (task 009 §4.2) ---------------------------------

/** Normalisasi ke E.164 Indonesia (62…). Return null bila tidak valid. */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  else if (digits.startsWith("620")) digits = `62${digits.slice(3)}`;
  return /^62\d{7,13}$/.test(digits) ? digits : null;
}

// ---- Verifikasi webhook Meta (task 009 §4.3) ----------------------------

/**
 * Verifikasi header `x-hub-signature-256` (format: "sha256=<hex>") —
 * HMAC-SHA256 body mentah dengan WHATSAPP_APP_SECRET. Constant-time.
 * Fail-closed: tanpa secret terpasang, signature dianggap tidak valid.
 */
export async function verifyMetaSignature(
  rawBody: string,
  header: string | null,
): Promise<boolean> {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;

  const expected = header.slice("sha256=".length);
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  if (digest.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(digest), Buffer.from(expected));
}

// ---- Copy per trigger (task 009 §2) ------------------------------------

function formatAmount(amount: unknown): string {
  if (typeof amount !== "number") return "";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: unknown): string {
  if (typeof iso !== "string") return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

function buildCopy(kind: WaKind, payload: Record<string, unknown>, vendorName: string): string {
  switch (kind) {
    case "welcome":
      return `Halo ${vendorName}! Selamat datang di TEMORA 👋 Buat event pertamamu, cetak QR kartu meja, dan kumpulkan momen tamu tanpa aplikasi.`;
    case "event_created":
      return `Event '${String(payload.eventName ?? "")}' siap dipakai. Bagikan QR kartu mejanya ya!`;
    case "photo_milestone":
      return `${String(payload.count ?? "")} momen terkumpul di '${String(payload.eventName ?? "")}'. Mulai unduh semuanya dari dashboard?`;
    case "invoice":
      return `Invoice TEMORA paket ${String(payload.tier ?? "")}: ${formatAmount(payload.amountIdr)}. Bayar sebelum momen berlalu ya: ${String(payload.paymentUrl ?? "")}`;
    case "payment_ok":
      return "Pembayaran diterima. Paket " + String(payload.tier ?? "") + " aktif 🎉 Selamat menemani momen-momen spesial!";
    case "expiry_reminder":
      if (payload.event === "renewal_reminder") {
        return `Masa aktif paket ${String(payload.tier ?? "")} kamu berakhir ${formatDate(payload.periodEnd)}. Perpanjang di sini ya: ${String(payload.billingUrl ?? "")}`;
      }
      return String(payload.message ?? "Info langganan TEMORA.");
    default:
      return "Pesan TEMORA.";
  }
}

// ---- Pengiriman ---------------------------------------------------------

const GRAPH_BASE = process.env.WA_GRAPH_BASE ?? "https://graph.facebook.com/v20.0";

async function sendViaCloudApi(phone: string, body: string): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    return { ok: false, error: "whatsapp-not-configured" };
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${GRAPH_BASE}/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body },
        }),
        cache: "no-store",
      });

      if (res.ok) {
        const data = (await res.json()) as {
          messages?: { id: string }[];
        };
        return { ok: true, messageId: data.messages?.[0]?.id ?? "" };
      }

      // 4xx selain rate limit tidak akan membaik dengan retry.
      if (res.status < 500 && res.status !== 429) {
        const detail = await res.text().catch(() => "");
        return { ok: false, error: `http-${res.status}: ${detail.slice(0, 200)}` };
      }
    } catch {
      // jaringan → retry
    }
  }
  return { ok: false, error: "network-after-retry" };
}

/** Jam WIB saat ini (0–23). */
function currentWibHour(): number {
  return (new Date().getUTCHours() + 7) % 24;
}

const CRITICAL_KINDS: ReadonlySet<WaKind> = new Set<WaKind>(["payment_ok"]);
const DAILY_LIMIT_PER_VENDOR = 3;

/**
 * Proses antrean: queued → sent/failed. Dipanggil cron tiap 5 menit
 * (architecture.md §12). Aman terhadap pemanggilan bersamaan secara MVP:
 * update status dilakukan kondisional per baris.
 */
export async function processWaQueue(limit = 25): Promise<{
  processed: number;
  sent: number;
  failed: number;
  deferred: number;
}> {
  const admin = createAdminClient();
  const result = { processed: 0, sent: 0, failed: 0, deferred: 0 };

  // Quiet hours 22:00–07:00 WIB → tunda seluruh pengiriman.
  const hour = currentWibHour();
  if (hour >= 22 || hour < 7) {
    return { ...result, deferred: -1 }; // -1 = ditunda global
  }

  const { data: logs } = await admin
    .from("whatsapp_logs")
    .select("id, vendor_id, kind, payload")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);

  type LogRow = {
    id: string;
    vendor_id: string;
    kind: WaKind;
    payload: Record<string, unknown>;
  };

  for (const log of (logs ?? []) as unknown as LogRow[]) {
    result.processed += 1;

    const { data: vendor } = await admin
      .from("vendors")
      .select("name, phone, wa_opt_in")
      .eq("id", log.vendor_id)
      .single();

    // Opt-out: hanya pesan kritis yang tetap dikirim (task 009 acceptance).
    if (!vendor?.wa_opt_in && !CRITICAL_KINDS.has(log.kind)) {
      await admin
        .from("whatsapp_logs")
        .update({ status: "failed", error: "opt-out" })
        .eq("id", log.id)
        .eq("status", "queued");
      result.failed += 1;
      continue;
    }

    const phone = normalizePhone(vendor?.phone);
    if (!phone) {
      await admin
        .from("whatsapp_logs")
        .update({ status: "failed", error: "invalid-or-missing-phone" })
        .eq("id", log.id)
        .eq("status", "queued");
      result.failed += 1;
      continue;
    }

    // Throttle: maks 3 pesan terkirim / hari / vendor (WIB).
    const startOfDayWibUtc = new Date(
      Date.now() - ((currentWibHour() * 60 + new Date().getUTCMinutes()) * 60_000),
    ).toISOString();
    const { count: sentToday } = await admin
      .from("whatsapp_logs")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", log.vendor_id)
      .eq("status", "sent")
      .gte("created_at", startOfDayWibUtc);

    if ((sentToday ?? 0) >= DAILY_LIMIT_PER_VENDOR && !CRITICAL_KINDS.has(log.kind)) {
      // Tetap queued — menyusul di window esok hari.
      result.deferred += 1;
      continue;
    }

    const copy = buildCopy(log.kind, log.payload, vendor?.name ?? "Sahabat TEMORA");
    const outcome = await sendViaCloudApi(phone, copy);

    if (outcome.ok) {
      await admin
        .from("whatsapp_logs")
        .update({
          status: "sent",
          payload: { ...log.payload, messageId: outcome.messageId },
        })
        .eq("id", log.id)
        .eq("status", "queued");
      result.sent += 1;
    } else {
      await admin
        .from("whatsapp_logs")
        .update({ status: "failed", error: outcome.error })
        .eq("id", log.id)
        .eq("status", "queued");
      result.failed += 1;
    }
  }

  return result;
}

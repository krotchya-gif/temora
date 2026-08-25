import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyMetaSignature } from "@/lib/whatsapp";

export const runtime = "nodejs";

// Webhook Meta Cloud API (task 009): verifikasi subscribe + delivery status.
type StatusValue = "sent" | "delivered" | "read" | "failed";

// GET — handshake verifikasi Meta (hub.verify_token vs WHATSAPP_VERIFY_TOKEN).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge") ?? "";

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return NextResponse.json({ ok: false }, { status: 403 });
}

// POST — update status pesan (sent/delivered/read/failed) berdasar messageId
// yang disimpan di payload log saat pengiriman.
// Signature `x-hub-signature-256` wajib valid (HMAC app secret, fail-closed).
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256")))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: {
    entry?: {
      changes?: {
        value?: {
          statuses?: {
            id: string;
            status: StatusValue;
            errors?: { title?: string }[];
          }[];
        };
      };
    }[];
  } | null = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // Body bukan JSON valid — perlakukan sebagai tanpa status.
  }

  const statuses = payload?.entry?.flatMap((e) => e.changes ?? []).flatMap((c) => c.value?.statuses ?? []) ?? [];
  if (statuses.length === 0) {
    // Bukan event status (mis. pesan masuk) — abaikan tanpa error.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const admin = createAdminClient();

  for (const status of statuses) {
    if (!status.id) continue;

    const { data: log } = await admin
      .from("whatsapp_logs")
      .select("id, status")
      .filter("payload->>messageId", "eq", status.id)
      .maybeSingle();
    if (!log) continue;

    if (status.status === "failed") {
      await admin
        .from("whatsapp_logs")
        .update({
          status: "failed",
          error: status.errors?.[0]?.title ?? "delivery-failed",
        })
        .eq("id", log.id);
    } else {
      // sent/delivered/read → catat progres terakhir di payload (log tetap 'sent').
      const { data: current } = await admin
        .from("whatsapp_logs")
        .select("payload")
        .eq("id", log.id)
        .single();
      await admin
        .from("whatsapp_logs")
        .update({
          payload: {
            ...((current?.payload as Record<string, unknown>) ?? {}),
            delivery: status.status,
          },
        })
        .eq("id", log.id);
    }
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOKEN_HEX } from "@/lib/constants";

export const runtime = "nodejs";

// GET /api/events/[id]/qr/[tableId] — SVG QR publik (architecture.md §3.3).
// Encode URL kanonik UUID: /p/{eventId}/{tableId} (task 005 §7).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string; tableId: string }> },
) {
  const { eventId, tableId } = await params;

  const admin = createAdminClient();

  // Validasi ringan: pasangan event+meja harus ada (tanpa bocorkan status).
  const { data: table } = await admin
    .from("tables")
    .select("id")
    .eq("id", tableId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (!table) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/+$/, "");
  const targetUrl = `${appUrl}/p/${eventId}/${tableId}`;

  const svg = await QRCode.toString(targetUrl, {
    type: "svg",
    errorCorrectionLevel: "M", // task 005 §4.2
    margin: 2,
    width: 512,
    color: {
      dark: `${TOKEN_HEX.textPrimary}ff`, // token text-primary (design-system §2.1)
      light: `${TOKEN_HEX.bgCard}ff`,
    },
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

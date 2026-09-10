import { NextResponse } from "next/server";
import { z } from "zod";
import { getSuperAdminOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";

const ALLOWED_KEYS = new Set(["ga_service_account"]);

const putSchema = z.object({
  key: z.string(),
  value: z.string().max(20_000),
});

const serviceAccountSchema = z.object({
  type: z.literal("service_account"),
  client_email: z.string().email(),
  private_key: z.string().startsWith("-----BEGIN PRIVATE KEY-----"),
});

// PUT /api/admin/secrets — simpan rahasia (mis. service account GA4/GSC).
// Nilai TIDAK PERNAH dikembalikan ke client (hanya status configured).
export async function PUT(request: Request) {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }
  const { key, value } = parsed.data;
  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: "Key tidak dikenal." }, { status: 400 });
  }

  if (key === "ga_service_account") {
    if (value.trim() === "") {
      // Kosong = hapus konfigurasi.
      const { error } = await createAdminClient()
        .from("admin_secrets")
        .delete()
        .eq("key", key);
      if (error) {
        return NextResponse.json({ error: "Secret gagal dihapus." }, { status: 500 });
      }
    } else {
      let serviceAccount: unknown;
      try {
        serviceAccount = JSON.parse(value);
      } catch {
        return NextResponse.json(
          { error: "Service account harus berupa JSON valid." },
          { status: 400 },
        );
      }
      if (!serviceAccountSchema.safeParse(serviceAccount).success) {
        return NextResponse.json(
          { error: "JSON bukan kredensial service account Google yang lengkap." },
          { status: 400 },
        );
      }
      const { error } = await createAdminClient().from("admin_secrets").upsert({
        key,
        value: value.trim(),
        updated_by: actor.id,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        return NextResponse.json({ error: "Secret gagal disimpan." }, { status: 500 });
      }
    }
  }

  await logAdminAction({
    actorId: actor.id,
    actorEmail: actor.email ?? "",
    action: "edit_settings",
    targetType: "vendor",
    targetId: null,
    detail: { keys: [key], note: "secret upsert (nilai tidak disimpan di log)" },
  });

  return NextResponse.json({ ok: true, configured: value.trim() !== "" });
}

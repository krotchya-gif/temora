import { NextResponse } from "next/server";
import { z } from "zod";
import { getSuperAdminOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";

const patchSchema = z.object({
  // Partial: kirim hanya key yang berubah (Zod record-enum menuntut lengkap).
  settings: z.object({
    social_instagram: z.string().max(300).optional(),
    social_tiktok: z.string().max(300).optional(),
    social_facebook: z.string().max(300).optional(),
  }),
});

// PATCH /api/admin/settings — simpan pengaturan platform (KV, task sosial media).
// Key di-whitelist; nilai kosong = fitur disembunyikan dari footer.
export async function PATCH(request: Request) {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const entries = Object.entries(parsed.data.settings);
  if (entries.length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
  }
  for (const [, value] of entries) {
    if (value && !/^https?:\/\//.test(value)) {
      return NextResponse.json(
        { error: "URL harus dimulai http:// atau https://" },
        { status: 400 },
      );
    }
  }

  const admin = createAdminClient();
  await Promise.all(
    entries.map(([key, value]) =>
      admin.from("platform_settings").upsert({
        key,
        value: value.trim(),
        updated_by: actor.id,
        updated_at: new Date().toISOString(),
      }),
    ),
  );

  await logAdminAction({
    actorId: actor.id,
    actorEmail: actor.email ?? "",
    action: "edit_settings",
    targetType: "vendor",
    targetId: null,
    detail: { keys: entries.map(([k]) => k) },
  });

  return NextResponse.json({ ok: true });
}

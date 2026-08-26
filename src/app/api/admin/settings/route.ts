import { NextResponse } from "next/server";
import { z } from "zod";
import { getSuperAdminOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";

const patchSchema = z.object({
  settings: z.record(z.string(), z.string()),
});

// Whitelist key — key di luar daftar ini ditolak (KV aman dari injeksi key baru).
const ALLOWED_KEYS = new Set([
  // Sosial footer (task sosial media).
  "social_instagram",
  "social_tiktok",
  "social_facebook",
  // SEO & GEO (tab SEO — /admin/seo).
  "seo_title",
  "seo_description",
  "seo_keywords",
  "seo_og_image",
  "robots_content",
  "sitemap_content",
  "ai_crawlers_block",
  "geo_lat",
  "geo_lng",
  // Analytics / Ads / GSC.
  "tracking_ga4_id",
  "tracking_gtm_id",
  "tracking_clarity_id",
  "tracking_pixel_id",
  "tracking_ads_id",
  "tracking_tiktok_id",
  "gsc_verification",
  "tracking_ga4_property_id",
  "tracking_gsc_site_url",
]);

const URL_KEYS = new Set([
  "social_instagram",
  "social_tiktok",
  "social_facebook",
  "seo_og_image",
]);

const ID_KEYS = new Set([
  "tracking_ga4_id",
  "tracking_gtm_id",
  "tracking_clarity_id",
  "tracking_pixel_id",
  "tracking_ads_id",
  "tracking_tiktok_id",
  "gsc_verification",
]);

const COORD_KEYS = new Set(["geo_lat", "geo_lng"]);

const TEXT_LIMITS: Record<string, number> = {
  seo_title: 200,
  seo_description: 400,
  seo_keywords: 500,
  ai_crawlers_block: 2000,
  robots_content: 20_000,
  sitemap_content: 50_000,
};

const ID_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;
const COORD_PATTERN = /^-?\d+(\.\d+)?$/;

function validateValue(key: string, value: string): string | null {
  if (URL_KEYS.has(key)) {
    if (value && !/^https?:\/\//.test(value)) {
      return "URL harus dimulai http:// atau https://";
    }
    return null;
  }
  if (ID_KEYS.has(key)) {
    if (value && !ID_PATTERN.test(value)) {
      return "ID hanya huruf/angka/dash/underscore (4–64 karakter).";
    }
    return null;
  }
  if (COORD_KEYS.has(key)) {
    if (value && !COORD_PATTERN.test(value)) {
      return "Koordinat harus angka desimal (mis. -6.200000).";
    }
    return null;
  }
  const limit = TEXT_LIMITS[key];
  if (limit && value.length > limit) {
    return `Maksimal ${limit.toLocaleString("id-ID")} karakter.`;
  }
  return null;
}

// PATCH /api/admin/settings — simpan pengaturan platform (KV whitelist).
// Validasi per-key: URL / ID / koordinat / teks (bukan URL global — robots_content
// dan sitemap_content bukan URL). Key non-whitelist ditolak.
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
  for (const [key] of entries) {
    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json({ error: `Key tidak dikenal: ${key}` }, { status: 400 });
    }
  }
  for (const [key, value] of entries) {
    const problem = validateValue(key, value);
    if (problem) {
      return NextResponse.json({ error: `${key}: ${problem}` }, { status: 400 });
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
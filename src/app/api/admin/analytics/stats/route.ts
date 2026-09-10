import { NextResponse } from "next/server";
import { getSuperAdminOrNull } from "@/lib/auth";
import { getAnalyticsStats } from "@/lib/google-analytics";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 30;

// GET /api/admin/analytics/stats — angka GA4 + GSC real (referensi seo.md §4.2).
// Kredensial service account dibaca server-side dari admin_secrets — tidak
// pernah dikirim ke browser. Hasil di-cache in-memory (±5 menit, google-analytics.ts).
export async function GET() {
  const actor = await getSuperAdminOrNull();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: secret } = await admin
    .from("admin_secrets")
    .select("value")
    .eq("key", "ga_service_account")
    .maybeSingle();

  const { data: settings } = await admin
    .from("platform_settings")
    .select("key, value")
    .in("key", ["tracking_ga4_property_id", "tracking_gsc_site_url"]);

  const get = (key: string) =>
    (settings ?? []).find((row) => row.key === key)?.value ?? null;

  const result = await getAnalyticsStats({
    serviceAccountJson: secret?.value ?? "",
    ga4PropertyId: get("tracking_ga4_property_id"),
    gscSiteUrl: get("tracking_gsc_site_url"),
  });

  const hasProviderError = Boolean(result.errors?.length);
  const hasProviderData = Boolean(result.data?.ga4 || result.data?.gsc);
  const status = hasProviderError ? (hasProviderData ? 207 : 502) : 200;

  return NextResponse.json(result, { status });
}

import type { Metadata } from "next";
import { SeoAdminHub, type TabKey } from "@/components/admin/seo/SeoAdminHub";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "SEO & Analytics — TEMORA Admin",
};
export const dynamic = "force-dynamic";

const KEYS = [
  "seo_title",
  "seo_description",
  "seo_keywords",
  "seo_og_image",
  "robots_content",
  "sitemap_content",
  "ai_crawlers_block",
  "geo_lat",
  "geo_lng",
  "tracking_ga4_id",
  "tracking_gtm_id",
  "tracking_clarity_id",
  "tracking_pixel_id",
  "tracking_ads_id",
  "tracking_tiktok_id",
  "gsc_verification",
  "tracking_ga4_property_id",
  "tracking_gsc_site_url",
];

// Halaman hub 5 tab (referensi docs/research/seo-admin-reference.md).
// Guard: proxy /admin/:path* + layout requireSuperAdminRsc + tiap API.
export default async function AdminSeoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab: TabKey = ["seo", "analytics", "marketing", "events", "utm"].includes(tab ?? "")
    ? (tab as TabKey)
    : "seo";
  const admin = createAdminClient();
  const [{ data: rows }, { data: secrets }] = await Promise.all([
    admin.from("platform_settings").select("key, value").in("key", KEYS),
    admin.from("admin_secrets").select("key").eq("key", "ga_service_account"),
  ]);

  const initial: Record<string, string> = {};
  for (const row of rows ?? []) initial[row.key] = row.value ?? "";
  const gaConfigured = Boolean(secrets && secrets.length > 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-text-primary">SEO &amp; Analytics</h1>
        <p className="text-sm text-text-secondary">
          Meta tag, tracking script, kampanye UTM, dan monitoring konversi — dikelola level superadmin.
        </p>
      </div>
      <SeoAdminHub
        initial={initial}
        gaConfigured={gaConfigured}
        initialTab={initialTab}
        baseUrl={(process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}
      />
    </div>
  );
}

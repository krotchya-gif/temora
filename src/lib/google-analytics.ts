// Statistik GA4 + Search Console real (server-side, referensi seo.md §4.2).
// Service account JSON disimpan di admin_secrets (TIDAK pernah ke browser);
// angka agregat di-cache in-memory ±5 menit agar tidak hit Google tiap reload.

import { JWT } from "google-auth-library";

const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
];

let cacheValue:
  | { at: number; data: AnalyticsStats | null; error: string | null }
  | null = null;
const CACHE_MS = 5 * 60_000;

export type AnalyticsStats = {
  ga4: {
    activeUsers: number | null;
    sessions: number | null;
    screenPageViews: number | null;
  } | null;
  gsc: {
    clicks: number | null;
    impressions: number | null;
    ctr: number | null;
    position: number | null;
    topQueries: { query: string; clicks: number }[];
  } | null;
};

export type StatsResult = {
  configured: boolean;
  data?: AnalyticsStats;
  error?: string;
};

export async function getAnalyticsStats(opts: {
  serviceAccountJson: string;
  ga4PropertyId: string | null;
  gscSiteUrl: string | null;
}): Promise<StatsResult> {
  if (!opts.serviceAccountJson.trim()) {
    return { configured: false };
  }
  if (!opts.ga4PropertyId && !opts.gscSiteUrl) {
    return { configured: true, error: "Isi GA4 property ID dan/atau GSC site URL." };
  }

  if (cacheValue && Date.now() - cacheValue.at < CACHE_MS) {
    return cacheValue.error
      ? { configured: true, error: cacheValue.error }
      : { configured: true, data: cacheValue.data ?? undefined };
  }

  try {
    const serviceAccount = JSON.parse(opts.serviceAccountJson) as {
      client_email: string;
      private_key: string;
    };
    const auth = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: SCOPES,
    });
    const token = await auth.getAccessToken();

    const ga4 = opts.ga4PropertyId
      ? await fetchGa4(token.token, opts.ga4PropertyId)
      : null;
    const gsc = opts.gscSiteUrl
      ? await fetchGsc(token.token, opts.gscSiteUrl)
      : null;

    const data: AnalyticsStats = { ga4, gsc };
    cacheValue = { at: Date.now(), data, error: null };
    return { configured: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat statistik.";
    cacheValue = { at: Date.now(), data: null, error: message };
    return { configured: true, error: message };
  }
}

async function fetchGa4(
  token: string | null | undefined,
  propertyId: string,
): Promise<AnalyticsStats["ga4"]> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
        ],
      }),
    },
  );
  if (!res.ok) throw new Error(`GA4 API ${res.status}`);
  const json = (await res.json()) as { rows?: { metricValues: { value: string }[] }[] };
  const row = json.rows?.[0];
  const v = (i: number) => (row ? Number(row.metricValues[i]?.value ?? 0) : null);
  return { activeUsers: v(0), sessions: v(1), screenPageViews: v(2) };
}

async function fetchGsc(
  token: string | null | undefined,
  siteUrl: string,
): Promise<AnalyticsStats["gsc"]> {
  const res = await fetch(
    `https://webmasters.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      siteUrl,
    )}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: sevenDaysAgo(),
        endDate: today(),
        dimensions: ["query"],
        rowLimit: 5,
      }),
    },
  );
  if (!res.ok) throw new Error(`GSC API ${res.status}`);
  const json = (await res.json()) as {
    rows?: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[];
  };
  const rows = json.rows ?? [];
  const totals = rows.reduce(
    (acc, r) => ({
      clicks: acc.clicks + r.clicks,
      impressions: acc.impressions + r.impressions,
      ctr: acc.ctr + r.ctr * r.impressions,
      position: acc.position + r.position * r.clicks,
      weight: acc.weight + r.impressions,
      clicksWeight: acc.clicksWeight + r.clicks,
    }),
    { clicks: 0, impressions: 0, ctr: 0, position: 0, weight: 0, clicksWeight: 0 },
  );
  return {
    clicks: totals.clicks,
    impressions: totals.impressions,
    ctr: totals.weight ? totals.ctr / totals.weight : null,
    position: totals.clicksWeight ? totals.position / totals.clicksWeight : null,
    topQueries: rows.map((r) => ({ query: r.keys[0] ?? "", clicks: r.clicks })),
  };
}

function sevenDaysAgo(): string {
  const d = new Date(Date.now() - 6 * 86_400_000);
  return d.toISOString().slice(0, 10);
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
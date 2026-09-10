// Statistik GA4 + Search Console real (server-side, referensi seo.md §4.2).
// Service account JSON disimpan di admin_secrets (TIDAK pernah ke browser);
// angka agregat di-cache in-memory ±5 menit agar tidak hit Google tiap reload.

import { JWT } from "google-auth-library";

const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
];

let cacheValue:
  | { key: string; at: number; data: AnalyticsStats }
  | null = null;
const CACHE_MS = 5 * 60_000;

export type AnalyticsProvider = "ga4" | "gsc";

export type AnalyticsProviderError = {
  provider: AnalyticsProvider;
  status: number | null;
  message: string;
};

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
  errors?: AnalyticsProviderError[];
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
    return {
      configured: true,
      errors: [{
        provider: "ga4",
        status: null,
        message: "Isi GA4 property ID dan/atau GSC site URL.",
      }],
    };
  }

  try {
    const serviceAccount = JSON.parse(opts.serviceAccountJson) as {
      client_email: string;
      private_key: string;
      private_key_id?: string;
    };
    const cacheKey = [
      serviceAccount.client_email,
      serviceAccount.private_key_id ?? "",
      opts.ga4PropertyId ?? "",
      opts.gscSiteUrl ?? "",
    ].join("|");
    if (
      cacheValue &&
      cacheValue.key === cacheKey &&
      Date.now() - cacheValue.at < CACHE_MS
    ) {
      return { configured: true, data: cacheValue.data };
    }

    const auth = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: SCOPES,
    });
    const token = await auth.getAccessToken();

    const [ga4Result, gscResult] = await Promise.allSettled([
      opts.ga4PropertyId
        ? fetchGa4(token.token, opts.ga4PropertyId)
        : Promise.resolve(null),
      opts.gscSiteUrl
        ? fetchGsc(token.token, opts.gscSiteUrl)
        : Promise.resolve(null),
    ]);

    const errors: AnalyticsProviderError[] = [];
    const ga4 = ga4Result.status === "fulfilled" ? ga4Result.value : null;
    const gsc = gscResult.status === "fulfilled" ? gscResult.value : null;
    if (ga4Result.status === "rejected") {
      errors.push(toProviderError("ga4", ga4Result.reason));
    }
    if (gscResult.status === "rejected") {
      errors.push(toProviderError("gsc", gscResult.reason));
    }

    const data: AnalyticsStats = { ga4, gsc };
    if (errors.length === 0) {
      cacheValue = { key: cacheKey, at: Date.now(), data };
    }
    return { configured: true, data, errors: errors.length ? errors : undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat statistik.";
    const providers: AnalyticsProvider[] = [
      ...(opts.ga4PropertyId ? (["ga4"] as const) : []),
      ...(opts.gscSiteUrl ? (["gsc"] as const) : []),
    ];
    return {
      configured: true,
      errors: providers.map((provider) => ({ provider, status: null, message })),
    };
  }
}

function toProviderError(
  provider: AnalyticsProvider,
  error: unknown,
): AnalyticsProviderError {
  if (error instanceof GoogleApiError) {
    return { provider, status: error.status, message: error.message };
  }
  return {
    provider,
    status: null,
    message: error instanceof Error ? error.message : "Gagal memuat statistik.",
  };
}

class GoogleApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

async function throwGoogleApiError(response: Response, provider: string) {
  let detail = "";
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    detail = body.error?.message?.trim() ?? "";
  } catch {
    // Provider tidak selalu mengirim JSON; status HTTP tetap cukup untuk diagnosis.
  }
  throw new GoogleApiError(
    response.status,
    detail ? `${provider}: ${detail}` : `${provider} API ${response.status}`,
  );
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
  if (!res.ok) await throwGoogleApiError(res, "GA4");
  const json = (await res.json()) as { rows?: { metricValues: { value: string }[] }[] };
  const row = json.rows?.[0];
  const v = (i: number) => (row ? Number(row.metricValues[i]?.value ?? 0) : null);
  return { activeUsers: v(0), sessions: v(1), screenPageViews: v(2) };
}

async function fetchGsc(
  token: string | null | undefined,
  siteUrl: string,
): Promise<AnalyticsStats["gsc"]> {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl,
  )}/searchAnalytics/query`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const baseBody = { startDate: sevenDaysAgo(), endDate: today() };
  const [totalsResponse, topResponse] = await Promise.all([
    fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...baseBody, rowLimit: 1 }),
    }),
    fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...baseBody, dimensions: ["query"], rowLimit: 5 }),
    }),
  ]);
  if (!totalsResponse.ok) await throwGoogleApiError(totalsResponse, "GSC");
  if (!topResponse.ok) await throwGoogleApiError(topResponse, "GSC");

  const totalsJson = (await totalsResponse.json()) as {
    rows?: { clicks: number; impressions: number; ctr: number; position: number }[];
  };
  const topJson = (await topResponse.json()) as {
    rows?: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[];
  };
  const totals = totalsJson.rows?.[0];
  const topRows = topJson.rows ?? [];
  return {
    clicks: totals?.clicks ?? 0,
    impressions: totals?.impressions ?? 0,
    ctr: totals?.ctr ?? null,
    position: totals?.position ?? null,
    topQueries: topRows.map((r) => ({ query: r.keys[0] ?? "", clicks: r.clicks })),
  };
}

function sevenDaysAgo(): string {
  const d = new Date(Date.now() - 6 * 86_400_000);
  return d.toISOString().slice(0, 10);
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

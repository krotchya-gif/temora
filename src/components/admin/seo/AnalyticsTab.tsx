"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputCls, textAreaCls } from "./fields";

type Props = {
  settings: Record<string, string>;
  set: (key: string, value: string) => void;
  gaConfigured: boolean;
};

type Stats = {
  configured: boolean;
  data?: {
    ga4?: { activeUsers: number | null; sessions: number | null; screenPageViews: number | null } | null;
    gsc?: {
      clicks: number | null;
      impressions: number | null;
      ctr: number | null;
      position: number | null;
      topQueries: { query: string; clicks: number }[];
    } | null;
  };
  error?: string;
};

// Tab Analytics (referensi seo-admin-reference.md §4.2): ID tracking publik
// + service account (rahasia, disimpan terpisah) + angka GA4/GSC real.
export function AnalyticsTab({ settings, set, gaConfigured }: Props) {
  const [saValue, setSaValue] = useState("");
  const [saStatus, setSaStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  async function saveServiceAccount() {
    setSaStatus("saving");
    const res = await fetch("/api/admin/secrets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "ga_service_account", value: saValue }),
    });
    setSaStatus(res.ok ? "saved" : "error");
  }

  async function loadStats() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics/stats");
      setStats((await res.json()) as Stats);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-4 p-5">
        <h2 className="font-display text-xl text-text-primary">ID Tracking</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GA4 Measurement ID" hint="G-XXXX">
            <input
              className={inputCls}
              value={settings.tracking_ga4_id ?? ""}
              onChange={(e) => set("tracking_ga4_id", e.target.value)}
              placeholder="G-1234567890"
            />
          </Field>
          <Field label="GA4 Property ID" hint="Untuk angka real (Data API).">
            <input
              className={inputCls}
              value={settings.tracking_ga4_property_id ?? ""}
              onChange={(e) => set("tracking_ga4_property_id", e.target.value)}
              placeholder="123456789"
            />
          </Field>
          <Field label="GTM Container ID">
            <input
              className={inputCls}
              value={settings.tracking_gtm_id ?? ""}
              onChange={(e) => set("tracking_gtm_id", e.target.value)}
              placeholder="GTM-XXXXXXX"
            />
          </Field>
          <Field label="Microsoft Clarity ID">
            <input
              className={inputCls}
              value={settings.tracking_clarity_id ?? ""}
              onChange={(e) => set("tracking_clarity_id", e.target.value)}
              placeholder="abcdefghij"
            />
          </Field>
          <Field label="GSC Site URL" hint="Untuk angka Search Console.">
            <input
              className={inputCls}
              value={settings.tracking_gsc_site_url ?? ""}
              onChange={(e) => set("tracking_gsc_site_url", e.target.value)}
              placeholder="sc-domain:temora.id"
            />
          </Field>
          <Field label="Verifikasi GSC (meta tag)" hint="sc-domain:… — dipasang ke &lt;head&gt;.">
            <input
              className={inputCls}
              value={settings.gsc_verification ?? ""}
              onChange={(e) => set("gsc_verification", e.target.value)}
              placeholder="4dHnF…"
            />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-display text-xl text-text-primary">Google API (Angka Real)</h2>
        <p className="text-sm text-text-secondary">
          Service account JSON ({gaConfigured ? "sudah terpasang ✓" : "belum terpasang"}) — disimpan
          terenkripsi di server, tidak pernah tampil lagi setelah simpan.
        </p>
        <textarea
          className={textAreaCls}
          value={saValue}
          onChange={(e) => setSaValue(e.target.value)}
          placeholder='{"type": "service_account", "client_email": "…", "private_key": "…"}'
        />
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={saveServiceAccount} disabled={saStatus === "saving"}>
            {saStatus === "saving" ? "Menyimpan…" : "Simpan Service Account"}
          </Button>
          {saStatus === "saved" ? <p className="text-sm text-success">Tersimpan.</p> : null}
          {saStatus === "error" ? (
            <p className="text-sm text-danger">Gagal — pastikan JSON valid.</p>
          ) : null}
          <span className="text-xs text-text-secondary/70">
            Kosongkan lalu simpan untuk menghapus.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="secondary" onClick={loadStats} disabled={loading}>
            {loading ? "Memuat…" : "Muat Statistik (7 hari)"}
          </Button>
        </div>

        {stats?.error ? (
          <p className="text-sm text-warning">{stats.error}</p>
        ) : null}
        {stats?.data ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-bg-warm p-3 text-sm">
              <p className="font-display text-base text-text-primary">GA4</p>
              {stats.data.ga4 ? (
                <dl className="mt-1 space-y-0.5 font-mono text-xs text-text-secondary">
                  <dt>Users aktif</dt>
                  <dd className="text-text-primary">{stats.data.ga4.activeUsers ?? "—"}</dd>
                  <dt>Sesi</dt>
                  <dd className="text-text-primary">{stats.data.ga4.sessions ?? "—"}</dd>
                  <dt>Pageview</dt>
                  <dd className="text-text-primary">{stats.data.ga4.screenPageViews ?? "—"}</dd>
                </dl>
              ) : (
                <p className="text-xs text-text-secondary">Belum dikonfigurasi.</p>
              )}
            </div>
            <div className="rounded-lg border border-border bg-bg-warm p-3 text-sm">
              <p className="font-display text-base text-text-primary">Search Console</p>
              {stats.data.gsc ? (
                <dl className="mt-1 space-y-0.5 font-mono text-xs text-text-secondary">
                  <dt>Clicks</dt>
                  <dd className="text-text-primary">{stats.data.gsc.clicks ?? "—"}</dd>
                  <dt>Impressions</dt>
                  <dd className="text-text-primary">{stats.data.gsc.impressions ?? "—"}</dd>
                  <dt>CTR</dt>
                  <dd className="text-text-primary">
                    {stats.data.gsc.ctr != null ? `${(stats.data.gsc.ctr * 100).toFixed(1)}%` : "—"}
                  </dd>
                  <dt>Posisi rata-rata</dt>
                  <dd className="text-text-primary">
                    {stats.data.gsc.position != null ? stats.data.gsc.position.toFixed(1) : "—"}
                  </dd>
                </dl>
              ) : (
                <p className="text-xs text-text-secondary">Belum dikonfigurasi.</p>
              )}
              {stats.data.gsc?.topQueries?.length ? (
                <ul className="mt-2 space-y-0.5 font-mono text-[11px] text-text-secondary">
                  {stats.data.gsc.topQueries.map((q) => (
                    <li key={q.query} className="truncate">
                      {q.query} · {q.clicks}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
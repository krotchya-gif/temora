"use client";

import { useState } from "react";
import { Activity, BarChart3, Link2, Megaphone, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SeoGeoTab } from "./SeoGeoTab";
import { AnalyticsTab } from "./AnalyticsTab";
import { MarketingTab } from "./MarketingTab";
import { EventsTab } from "./EventsTab";
import { UtmTab } from "./UtmTab";

type TabKey = "seo" | "analytics" | "marketing" | "events" | "utm";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "seo", label: "SEO & GEO", icon: <Tag size={13} aria-hidden /> },
  { key: "analytics", label: "Analytics", icon: <BarChart3 size={13} aria-hidden /> },
  { key: "marketing", label: "Marketing & Ads", icon: <Megaphone size={13} aria-hidden /> },
  { key: "events", label: "Event Monitor", icon: <Activity size={13} aria-hidden /> },
  { key: "utm", label: "Campaign UTM", icon: <Link2 size={13} aria-hidden /> },
];

type SeoAdminHubProps = {
  initial: Record<string, string>;
  gaConfigured: boolean;
};

// Hub 5 tab (referensi seo-admin-reference.md §3): satu objek form + satu
// tombol Simpan global; data berat (statistik/event/UTM) lazy-load per tab.
export function SeoAdminHub({ initial, gaConfigured }: SeoAdminHubProps) {
  const [tab, setTab] = useState<TabKey>("seo");
  const [settings, setSettings] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  async function handleSave() {
    setStatus("saving");
    setErrorMsg("");
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });
    if (res.ok) {
      setStatus("saved");
    } else {
      setStatus("error");
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setErrorMsg(body?.error ?? "Gagal menyimpan.");
    }
  }

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Pengaturan SEO"
        className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-bg-card p-1.5"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue ${
              tab === t.key
                ? "bg-accent text-white"
                : "text-text-secondary hover:bg-bg-warm hover:text-text-primary"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "seo" ? <SeoGeoTab settings={settings} set={set} /> : null}
      {tab === "analytics" ? (
        <AnalyticsTab settings={settings} set={set} gaConfigured={gaConfigured} />
      ) : null}
      {tab === "marketing" ? <MarketingTab settings={settings} set={set} /> : null}
      {tab === "events" ? <EventsTab /> : null}
      {tab === "utm" ? <UtmTab /> : null}

      {tab !== "events" && tab !== "utm" ? (
        <Card className="flex items-center gap-3 p-4">
          <Button size="sm" onClick={handleSave} disabled={status === "saving"}>
            {status === "saving" ? "Menyimpan…" : "Simpan Pengaturan"}
          </Button>
          {status === "saved" ? (
            <p className="text-sm text-success">Tersimpan — situs publik diperbarui.</p>
          ) : null}
          {status === "error" ? (
            <p role="alert" className="text-sm text-danger">
              {errorMsg || "Gagal menyimpan."}
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
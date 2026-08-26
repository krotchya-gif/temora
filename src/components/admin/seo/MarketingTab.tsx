"use client";

import { Card } from "@/components/ui/Card";
import { Field, inputCls } from "./fields";

type Props = {
  settings: Record<string, string>;
  set: (key: string, value: string) => void;
};

// Tab Marketing & Ads (referensi seo-admin-reference.md §4.3): pixel/palacak
// iklan — di-inject SeoScripts.tsx di sisi publik.
export function MarketingTab({ settings, set }: Props) {
  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-display text-xl text-text-primary">Marketing &amp; Ads</h2>
      <p className="text-sm text-text-secondary">
        ID pixel/palacak yang di-inject otomatis ke semua halaman publik. Kosongkan
        untuk menonaktifkan masing-masing.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Meta Pixel ID">
          <input
            className={inputCls}
            value={settings.tracking_pixel_id ?? ""}
            onChange={(e) => set("tracking_pixel_id", e.target.value)}
            placeholder="1234567890123456"
          />
        </Field>
        <Field label="Google Ads ID" hint="Konversi via gtag.">
          <input
            className={inputCls}
            value={settings.tracking_ads_id ?? ""}
            onChange={(e) => set("tracking_ads_id", e.target.value)}
            placeholder="AW-123456789"
          />
        </Field>
        <Field label="TikTok Pixel ID">
          <input
            className={inputCls}
            value={settings.tracking_tiktok_id ?? ""}
            onChange={(e) => set("tracking_tiktok_id", e.target.value)}
            placeholder="CXXXXXXXXXXXXXXXXX"
          />
        </Field>
      </div>
    </Card>
  );
}
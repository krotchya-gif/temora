"use client";

import { AI_CRAWLERS } from "@/lib/seo-constants";
import { Card } from "@/components/ui/Card";
import { Field, inputCls, textAreaCls } from "./fields";

type Props = {
  settings: Record<string, string>;
  set: (key: string, value: string) => void;
};

// Tab SEO & GEO (referensi seo-admin-reference.md §4.1): meta tag, OG image,
// file robots/sitemap (manual + fallback otomatis), blokir bot AI, koordinat GEO.
export function SeoGeoTab({ settings, set }: Props) {
  const blocked = (settings.ai_crawlers_block ?? "")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  function toggleBot(bot: string) {
    const next = blocked.includes(bot)
      ? blocked.filter((b) => b !== bot)
      : [...blocked, bot];
    set("ai_crawlers_block", next.join(","));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-4 p-5">
        <h2 className="font-display text-xl text-text-primary">Meta Tags</h2>
        <Field label="SEO Title" hint="Fallback: TEMORA — Virtual Photobooth for Every Moment">
          <input
            className={inputCls}
            value={settings.seo_title ?? ""}
            onChange={(e) => set("seo_title", e.target.value)}
            maxLength={200}
          />
        </Field>
        <Field label="Meta Description" hint="Fallback: kalimat tagline BRAND.md §10.">
          <textarea
            className={textAreaCls}
            value={settings.seo_description ?? ""}
            onChange={(e) => set("seo_description", e.target.value)}
            maxLength={400}
          />
        </Field>
        <Field label="Keywords" hint="Pisahkan dengan koma (BRAND.md §9).">
          <input
            className={inputCls}
            value={settings.seo_keywords ?? ""}
            onChange={(e) => set("seo_keywords", e.target.value)}
            maxLength={500}
          />
        </Field>
        <Field
          label="OG Image URL"
          hint="Harus https:// (scraper WA/FB/X menolak http). Kosong = /og.png."
        >
          <input
            className={inputCls}
            value={settings.seo_og_image ?? ""}
            onChange={(e) => set("seo_og_image", e.target.value)}
            placeholder="https://…/og.png"
            type="url"
          />
        </Field>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-display text-xl text-text-primary">File SEO</h2>
        <Field
          label="Isi robots.txt (opsional)"
          hint="Kosong = template otomatis (blokir admin/dashboard/api + bot AI + sitemap)."
        >
          <textarea
            className={textAreaCls}
            value={settings.robots_content ?? ""}
            onChange={(e) => set("robots_content", e.target.value)}
            placeholder={"User-agent: *\nDisallow: /admin\n…"}
          />
        </Field>
        <Field
          label="Isi sitemap.xml (opsional)"
          hint="Kosong = sitemap otomatis 7 halaman publik."
        >
          <textarea
            className={textAreaCls}
            value={settings.sitemap_content ?? ""}
            onChange={(e) => set("sitemap_content", e.target.value)}
            placeholder={"<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset …"}
          />
        </Field>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-display text-xl text-text-primary">Blokir Bot AI (LLMO)</h2>
        <p className="text-sm text-text-secondary">
          Bot tercentang mendapat <code className="font-mono text-xs">Disallow: /</code> di robots.txt.
        </p>
        <ul className="grid grid-cols-2 gap-2">
          {AI_CRAWLERS.map((bot) => (
            <li key={bot}>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={blocked.includes(bot)}
                  onChange={() => toggleBot(bot)}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                <span className="truncate font-mono text-xs">{bot}</span>
              </label>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-display text-xl text-text-primary">GEO / Lokasi</h2>
        <p className="text-sm text-text-secondary">
          Koordinat bisnis untuk JSON-LD LocalBusiness (muncul di hasil pencarian).
          Kosongkan untuk melewatinya.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude">
            <input
              className={inputCls}
              value={settings.geo_lat ?? ""}
              onChange={(e) => set("geo_lat", e.target.value)}
              placeholder="-6.200000"
            />
          </Field>
          <Field label="Longitude">
            <input
              className={inputCls}
              value={settings.geo_lng ?? ""}
              onChange={(e) => set("geo_lng", e.target.value)}
              placeholder="106.816666"
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}
import { appUrl, getPublicSettings, PUBLIC_SITEMAP_PATHS, SITEMAP_LASTMOD, SITEMAP_META } from "@/lib/seo-settings";

// GET /sitemap.xml — dinamis dari platform_settings (referensi seo.md §2).
// sitemap_content (admin) = override penuh; fallback = halaman publik statis
// + lastmod/changefreq/priority (BRAND.md §10).
export async function GET() {
  const settings = await getPublicSettings();

  if (settings.sitemap_content?.trim()) {
    return new Response(settings.sitemap_content.trim(), {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }

  const base = appUrl();
  const urls = PUBLIC_SITEMAP_PATHS.map((path) => {
    const meta = SITEMAP_META[path] ?? { changefreq: "monthly", priority: "0.5" };
    return (
      `  <url><loc>${base.origin}${path}</loc>` +
      `<lastmod>${SITEMAP_LASTMOD}</lastmod>` +
      `<changefreq>${meta.changefreq}</changefreq>` +
      `<priority>${meta.priority}</priority></url>`
    );
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
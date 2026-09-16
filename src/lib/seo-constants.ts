// Konstanta SEO murni (tanpa dependensi server/client) — aman di-import
// dari komponen "use client" (tab SEO admin).

/** Daftar bot AI untuk blokir (tab SEO & GEO — referensi §4.1). */
export const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "Google-Extended",
  "ClaudeBot",
  "Claude-Web",
  "PerplexityBot",
  "CCBot",
  "anthropic-ai",
  "Bytespider",
  "cohere-ai",
  "meta-externalagent",
  "Applebot-Extended",
  "Amazonbot",
] as const;

export function blockedAiBots(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);
}

/** Halaman publik statis untuk fallback sitemap (BRAND.md §11). */
export const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/how-it-works",
  "/moments",
  "/pricing",
  "/faq",
  "/privacy",
  "/terms",
] as const;

/**
 * lastmod fallback sitemap (BRAND.md §10) — BUMP MANUAL tiap halaman publik
 * berubah. Sengaja konstanta (bukan tanggal dinamis) agar jujur.
 */
export const SITEMAP_LASTMOD = "2026-09-16";

/** changefreq/priority per path untuk fallback sitemap (BRAND.md §10). */
export const SITEMAP_META: Record<string, { changefreq: string; priority: string }> = {
  "/": { changefreq: "weekly", priority: "1.0" },
  "/how-it-works": { changefreq: "monthly", priority: "0.8" },
  "/moments": { changefreq: "weekly", priority: "0.8" },
  "/pricing": { changefreq: "monthly", priority: "0.8" },
  "/faq": { changefreq: "monthly", priority: "0.6" },
  "/privacy": { changefreq: "yearly", priority: "0.4" },
  "/terms": { changefreq: "yearly", priority: "0.4" },
};
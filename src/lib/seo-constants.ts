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
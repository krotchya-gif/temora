import { appUrl, getPublicSettings } from "@/lib/seo-settings";
import { blockedAiBots } from "@/lib/seo-constants";

// GET /robots.txt — dinamis dari platform_settings (referensi seo.md §2).
// robots_content (admin) = override penuh; fallback = template default +
// blokir bot AI yang dicentang + baris Sitemap.
export async function GET() {
  const settings = await getPublicSettings();

  if (settings.robots_content?.trim()) {
    return new Response(settings.robots_content.trim(), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const lines = [
    "User-agent: *",
    "Disallow: /admin",
    "Disallow: /dashboard",
    "Disallow: /api",
    "Disallow: /login",
    "Disallow: /signup",
    "Disallow: /print",
    "Disallow: /p/",
    "",
  ];

  for (const bot of blockedAiBots(settings.ai_crawlers_block)) {
    lines.push(`User-agent: ${bot}`, "Disallow: /", "");
  }

  lines.push(`Sitemap: ${appUrl().origin}/sitemap.xml`);

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
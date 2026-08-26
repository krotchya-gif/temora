"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Facebook, Instagram } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

const footerLinks = [
  { href: "/how-it-works", label: "Cara Kerja" },
  { href: "/moments", label: "Moments" },
  { href: "/pricing", label: "Harga" },
  { href: "/privacy", label: "Privasi" },
  { href: "/terms", label: "Syarat" },
];

// TikTok tidak tersedia di lucide — glyph inline, warna ikut currentColor.
function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-[18px] w-[18px]">
      <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

type SocialEntry = {
  key: string;
  label: string;
  url: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const socialFields = [
  { key: "social_instagram", label: "Instagram", Icon: Instagram },
  { key: "social_tiktok", label: "TikTok", Icon: TikTokIcon },
  { key: "social_facebook", label: "Facebook", Icon: Facebook },
] as const;

export function MarketingFooter() {
  const [socials, setSocials] = useState<SocialEntry[]>([]);

  // Footer berada di dalam boundary client (MarketingLayout), jadi settings
  // dibaca lewat browser client — data publik dari platform_settings.
  useEffect(() => {
    let supabase;
    try {
      supabase = createClient();
    } catch {
      return; // build lokal tanpa env — ikon tetap disembunyikan
    }
    void (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["social_instagram", "social_tiktok", "social_facebook"]);

      setSocials(
        socialFields
          .map((field) => ({
            key: field.key,
            label: field.label,
            url: (data ?? []).find((row: { key: string; value: string }) => row.key === field.key)?.value ?? "",
            Icon: field.Icon,
          }))
          .filter((field) => field.url.length > 0),
      );
    })();
  }, []);

  return (
    <footer className="border-t border-border bg-bg-warm">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-3">
            <p className="font-display text-2xl tracking-wordmark text-text-primary">
              {SITE_NAME}
            </p>
            <p className="text-sm leading-relaxed text-text-secondary">
              {SITE_TAGLINE}
              <br />
              Virtual photobooth untuk wedding, ulang tahun, dan acara spesial.
            </p>

            {socials.length > 0 && (
              <div className="flex items-center gap-3 pt-1">
                {socials.map(({ key, label, url, Icon }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${SITE_NAME} di ${label}`}
                    className="grid h-10 w-10 place-items-center rounded-full border border-border bg-bg-card text-text-secondary transition-colors hover:border-accent hover:text-accent"
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <nav className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 border-t border-border/80 pt-6 text-center text-xs text-text-secondary md:text-left">
          © {new Date().getFullYear()} {SITE_NAME}. Keep it close. Keep it TEMORA.
        </div>
      </div>
    </footer>
  );
}

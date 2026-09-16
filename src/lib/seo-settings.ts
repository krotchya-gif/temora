// Helper pengaturan platform sisi server (docs/research/seo-admin-reference.md §2).
// platform_settings = KV publik-safe (RLS public read sengaja); rahasia terpisah
// di admin_secrets (hanya service role / API superadmin).
// Konstanta murni (AI_CRAWLERS dll.) ada di seo-constants.ts — aman untuk
// komponen "use client".

import { cache } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  AI_CRAWLERS,
  blockedAiBots,
  PUBLIC_SITEMAP_PATHS,
  SITEMAP_LASTMOD,
  SITEMAP_META,
} from "@/lib/seo-constants";

export { AI_CRAWLERS, blockedAiBots, PUBLIC_SITEMAP_PATHS, SITEMAP_LASTMOD, SITEMAP_META };

export type PublicSettings = Record<string, string>;

/** Baca semua platform_settings — di-cache per-request (React cache). */
export const getPublicSettings = cache(async (): Promise<PublicSettings> => {
  const map: PublicSettings = {};
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("platform_settings").select("key, value");
    for (const row of data ?? []) map[row.key] = row.value ?? "";
  } catch {
    // Build lokal tanpa env → nilai kosong (fallback default dipakai).
  }
  return map;
});

/** Base URL app — paksa HTTPS di luar localhost (og:image dll. wajib https). */
export function appUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL(raw);
  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    url.protocol = "https:";
  }
  return url;
}

/**
 * Metadata on-page standar halaman publik (BRAND.md §10): canonical
 * self-referencing + og:url eksplisit + OG/Twitter memakai title/description
 * halaman sendiri (bukan default homepage). Gambar mengikuti seo_og_image
 * admin (fallback /og.png) agar override /admin/seo tetap berlaku.
 */
export async function publicPageMetadata(opts: {
  path: string;
  title: string;
  description: string;
}): Promise<Metadata> {
  const settings = await getPublicSettings();
  const ogImage = settings.seo_og_image?.trim() || "/og.png";
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    openGraph: {
      url: opts.path,
      title: opts.title,
      description: opts.description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: "TEMORA" }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [ogImage],
    },
  };
}
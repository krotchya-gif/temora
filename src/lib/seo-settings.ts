// Helper pengaturan platform sisi server (docs/research/seo-admin-reference.md §2).
// platform_settings = KV publik-safe (RLS public read sengaja); rahasia terpisah
// di admin_secrets (hanya service role / API superadmin).
// Konstanta murni (AI_CRAWLERS dll.) ada di seo-constants.ts — aman untuk
// komponen "use client".

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  AI_CRAWLERS,
  blockedAiBots,
  PUBLIC_SITEMAP_PATHS,
} from "@/lib/seo-constants";

export { AI_CRAWLERS, blockedAiBots, PUBLIC_SITEMAP_PATHS };

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
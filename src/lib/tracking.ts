// Tracking event konversi & kampanye UTM sisi client (referensi seo.md §4.4-4.5).
// Insert langsung via anon (RLS: event_logs/utm_visits = insert-only, read
// eksklusif superadmin). Gagal diam-diam — jangan pernah ganggu UX tamu.

import { createClient } from "@/lib/supabase/client";

export type TrackEventValue = Record<string, string | number | boolean | null>;

export async function trackEvent(
  eventName: string,
  label: string,
  page: string,
  value?: TrackEventValue,
): Promise<void> {
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return; // build lokal tanpa env
  }
  await supabase.from("event_logs").insert({
    event_name: eventName,
    label,
    page,
    value: value ?? null,
  });
}

/** Catat kunjungan kampanye bila URL mengandung ?utm_* (1× per sesi per kampanye). */
export function trackUtmIfPresent(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const source = params.get("utm_source");
  if (!source) return;

  const campaign = params.get("utm_campaign") ?? "";
  const key = `utm_visit_${source}_${campaign}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    // Diingat untuk atribusi konversi (checkout → subscriptions.utm_source).
    sessionStorage.setItem("utm_source", source);
  } catch {
    return;
  }

  let supabase;
  try {
    supabase = createClient();
  } catch {
    return;
  }
  void supabase.from("utm_visits").insert({
    utm_source: source,
    utm_medium: params.get("utm_medium"),
    utm_campaign: campaign || null,
    landing_url: window.location.pathname,
    referrer: document.referrer || null,
    session_id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : null,
  });
}
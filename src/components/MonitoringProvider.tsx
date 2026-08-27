"use client";

import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { trackUtmIfPresent } from "@/lib/tracking";

// Client-side monitoring (task 015): Vercel Analytics web vitals (no-op di
// luar Vercel) + pencatatan kunjungan kampanye UTM (tab UTM — /admin/seo).
// Error tracking ditangani Log Node app hPanel (bukan tool pihak ketiga).
export function MonitoringProvider() {
  useEffect(() => {
    trackUtmIfPresent();
  }, []);

  return <Analytics />;
}
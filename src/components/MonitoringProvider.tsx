"use client";

import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";

// Client-side monitoring (task 015): Sentry browser init + Vercel Analytics
// web vitals. Keduanya no-op di luar produksi / tanpa key.
export function MonitoringProvider() {
  useEffect(() => {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return;
    void import("@sentry/nextjs").then((Sentry) => {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1,
      });
    });
  }, []);

  return <Analytics />;
}

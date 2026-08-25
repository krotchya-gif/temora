// Sentry (architecture.md §9) — inisialisasi hanya bila SENTRY_DSN terpasang,
// sehingga build & dev lokal tanpa key tetap bersih (task 015 §7: pasang sejak awal).

export async function initSentry(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "development",
    tracesSampleRate: 0.1,
  });
}

/** Tangkap error non-fatal di API routes tanpa crash proses. */
export async function captureError(err: unknown, context?: Record<string, unknown>): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    // monitoring tidak boleh menggagalkan request
  }
}

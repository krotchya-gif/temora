// Sentry (architecture.md §9) — inisialisasi hanya bila DSN terpasang,
// sehingga build & dev lokal tanpa key tetap bersih (task 015 §7: pasang sejak awal).
// Satu variabel NEXT_PUBLIC_SENTRY_DSN dipakai client & server; SENTRY_DSN
// lama tetap diterima sebagai fallback agar env existing tidak langsung mati.

function activeDsn(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
}

export async function initSentry(): Promise<void> {
  const dsn = activeDsn();
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
  if (!activeDsn()) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    // monitoring tidak boleh menggagalkan request
  }
}

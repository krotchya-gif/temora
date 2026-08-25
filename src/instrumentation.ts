// Next.js 16 instrumentation hook — jalan sekali per proses server.
// Sentry server-side init (task 015); no-op tanpa SENTRY_DSN.
export async function register() {
  const { initSentry } = await import("@/lib/sentry");
  await initSentry();
}

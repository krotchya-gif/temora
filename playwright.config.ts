import { defineConfig } from "@playwright/test";

/**
 * Task 016 — jalankan hanya saat backend siap:
 *   E2E_ENABLED=1 npm run test:e2e
 * Butuh Supabase aktif + data seed (E2E_EVENT_ID / E2E_TABLE_ID).
 * Kamera tamu memakai fake media stream Chromium (task 016 §7).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
          ],
        },
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --port 3100",
        url: "http://localhost:3100/api/health",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

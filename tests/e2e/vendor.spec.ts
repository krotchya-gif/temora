import { expect, test } from "@playwright/test";

// Jalur kritis 2 — Vendor (task 016 §2): login → buat event → generate QR
// → kelola Momen. (Signup terpisah diuji manual karena butuh verifikasi email.)
test.skip(!process.env.E2E_ENABLED, "E2E aktif hanya dengan E2E_ENABLED=1 + seed");

const email = process.env.E2E_VENDOR_EMAIL!;
const password = process.env.E2E_VENDOR_PASSWORD!;

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata Sandi").fill(password);
  await page.getByRole("button", { name: /masuk/i }).click();
  await page.waitForURL("**/dashboard");
}

test("vendor buat event, generate QR, buka Momen terpadu", async ({ page }) => {
  await login(page);

  // Free tier = max 1 event aktif — nonaktifkan sisa event dari run sebelumnya
  // lewat API (session sama), agar create event baru tidak diblokir.
  const eventsRes = await page.request.get("/api/events");
  const { events: existing } = (await eventsRes.json()) as {
    events: Array<{ id: string; isActive: boolean }>;
  };
  for (const ev of existing) {
    if (ev.isActive) {
      await page.request.put(`/api/events/${ev.id}`, { data: { isActive: false } });
    }
  }

  await page.goto("/dashboard/events/new");
  await page.getByLabel("Nama event").fill(`QA Event ${Date.now()}`);
  await page.getByRole("button", { name: "Simpan Event" }).click();
  await page.waitForURL(
    (url) =>
      /\/dashboard\/events\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        url.pathname,
      ),
  );

  const eventId = page.url().split("/").pop()!;

  // API feed wajib terautentikasi melalui sesi vendor dan format ZIP divalidasi.
  const feedRes = await page.request.get(`/api/events/${eventId}/feed?limit=20`);
  expect(feedRes.status()).toBe(200);
  expect(await feedRes.json()).toMatchObject({ items: [], nextCursor: null, total: 0 });
  const invalidZipRes = await page.request.post(`/api/events/${eventId}/photos/zip`, {
    data: { format: "tidak-valid" },
  });
  expect(invalidZipRes.status()).toBe(400);

  const unknownFeedRes = await page.request.get(
    "/api/events/00000000-0000-4000-8000-000000000000/feed",
  );
  expect(unknownFeedRes.status()).toBe(404);

  // Generate meja + QR
  await page.goto(`/dashboard/events/${eventId}/qr`);
  await page.getByLabel("Jumlah meja baru").fill("2");
  await page.getByRole("button", { name: "Buat Meja & QR" }).click();
  await expect(page.getByText(/meja siap dipasang|2/).first()).toBeVisible({ timeout: 15_000 });

  // Route Galeri lama tetap kompatibel dan berakhir di Momen.
  await page.goto(`/dashboard/events/${eventId}/gallery`);
  await expect(page).toHaveURL(new RegExp(`/dashboard/events/${eventId}/moments$`));
  await expect(page.getByText("momen terkumpul")).toBeVisible();

  // Lima tab tetap muat pada viewport minimum tanpa scroll horizontal.
  await page.setViewportSize({ width: 360, height: 800 });
  const eventMenu = page.getByRole("navigation", { name: "Menu event" });
  await expect(eventMenu.getByRole("link")).toHaveCount(5);
  await expect(eventMenu.getByRole("link", { name: "Momen", exact: true })).toHaveAttribute("aria-current", "page");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  // Sponsor lama diarahkan ke section tersimpan-mandiri di Setup Tampilan.
  await page.goto(`/dashboard/events/${eventId}/sponsors`);
  await expect(page).toHaveURL(new RegExp(`/dashboard/events/${eventId}/edit#sponsor$`));
  await expect(page.getByRole("heading", { name: "Logo partner event" })).toBeVisible();
  await expect(page.getByText(/Sponsor tersedia di paket Pro|Nama sponsor/).first()).toBeVisible();
});

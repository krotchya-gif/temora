import { expect, test } from "@playwright/test";

// Jalur kritis 2 — Vendor (task 016 §2): login → buat event → generate QR
// → lihat galeri. (Signup terpisah diuji manual karena butuh verifikasi email.)
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

test("vendor buat event, generate QR, buka galeri", async ({ page }) => {
  await login(page);

  await page.goto("/dashboard/events/new");
  await page.getByLabel("Nama event").fill(`QA Event ${Date.now()}`);
  await page.getByRole("button", { name: "Simpan Event" }).click();
  await page.waitForURL("**/dashboard/events/**");

  const eventId = page.url().split("/").pop()!;

  // Generate meja + QR
  await page.goto(`/dashboard/events/${eventId}/qr`);
  await page.getByLabel("Jumlah meja baru").fill("2");
  await page.getByRole("button", { name: "Buat Meja & QR" }).click();
  await expect(page.getByText(/meja siap dipasang|2/).first()).toBeVisible({ timeout: 15_000 });

  // Galeri (kosong tapi grid render)
  await page.goto(`/dashboard/events/${eventId}/gallery`);
  await expect(page.getByText("momen terkumpul")).toBeVisible();
});

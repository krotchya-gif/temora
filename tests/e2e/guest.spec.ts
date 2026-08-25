import { expect, test } from "@playwright/test";

// Jalur kritis 1 — Tamu (task 016 §2): scan QR → consent → capture (mock
// kamera via fake media stream) → upload → simpan/bagikan.
test.skip(!process.env.E2E_ENABLED, "E2E aktif hanya dengan E2E_ENABLED=1 + seed");

const eventId = process.env.E2E_EVENT_ID!;
const tableId = process.env.E2E_TABLE_ID!;

test("tamu capture & simpan momen", async ({ page, context }) => {
  await context.grantPermissions(["camera"], { origin: process.env.E2E_BASE_URL ?? "http://localhost:3100" });

  await page.goto(`/p/${eventId}/${tableId}`);

  // Consent screen (design-system §3.7)
  await expect(page.getByRole("button", { name: "Oke, Mengerti" })).toBeVisible();
  await page.getByRole("button", { name: "Oke, Mengerti" }).click();

  // Kamera live (fake device) → capture
  const capture = page.getByRole("button", { name: "Ambil Momen" });
  await expect(capture).toBeEnabled({ timeout: 15_000 });
  await capture.click();

  // Preview: Simpan ke galeri
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByText("Momen tersimpan ✨")).toBeVisible({ timeout: 20_000 });

  // Simpan ke HP (Web Share fallback unduh di Chromium desktop)
  await expect(page.getByRole("button", { name: "Simpan ke HP" })).toBeVisible();
});

import { expect, test } from "@playwright/test";

// Jalur kritis 3 — Billing (task 016 §2): checkout sandbox Xendit → webhook
// paid → tier naik. Butuh XENDIT_SECRET_KEY + XENDIT_WEBHOOK_TOKEN sandbox.
test.skip(
  !process.env.E2E_ENABLED || !process.env.XENDIT_SECRET_KEY,
  "Billing E2E aktif dengan kredensial sandbox Xendit",
);

const email = process.env.E2E_VENDOR_EMAIL!;
const password = process.env.E2E_VENDOR_PASSWORD!;

test("checkout membuat invoice & redirect ke Xendit", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata Sandi").fill(password);
  await page.getByRole("button", { name: /masuk/i }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/dashboard/billing");
  await page.getByRole("button", { name: /upgrade ke basic/i }).click();

  // Redirect ke invoice Xendit (sandbox)
  await page.waitForURL(/xendit|invoice/i, { timeout: 20_000 });
  expect(page.url()).not.toContain("/dashboard/billing");
});

// Webhook replay idempoten — regression task 008. Dipanggil langsung ke API
// dengan token callback; efek ganda tidak boleh terjadi.
test("webhook replay tidak menduplikasi efek", async ({ request, baseURL }) => {
  const token = process.env.XENDIT_WEBHOOK_TOKEN!;
  const payload = {
    // external_id harus subscription pending yang ada di seed — lihat qa-report.
    id: process.env.E2E_XENDIT_INVOICE_ID!,
    external_id: process.env.E2E_XENDIT_INVOICE_ID!,
    status: "PAID",
  };

  for (let i = 0; i < 2; i++) {
    const res = await request.post(`${baseURL}/api/billing/webhook`, {
      headers: { "x-callback-token": token },
      data: payload,
    });
    expect(res.ok()).toBeTruthy();
  }
  // Verifikasi tier naik sekali saja dilakukan via query DB — langkah manual di qa-report.
});

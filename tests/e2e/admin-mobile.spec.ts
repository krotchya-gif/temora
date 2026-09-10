import { expect, test } from "@playwright/test";

const enabled = Boolean(
  process.env.E2E_ENABLED &&
    process.env.E2E_ADMIN_EMAIL &&
    process.env.E2E_ADMIN_PASSWORD,
);
test.skip(!enabled, "Butuh E2E_ENABLED dan kredensial superadmin.");

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("Kata Sandi").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: /masuk/i }).click();
  await page.waitForURL("**/admin");
}

test("admin mobile memakai drawer tanpa overflow horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page);

  const menu = page.getByRole("button", { name: "Buka menu admin" });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("dialog", { name: "Menu admin" })).toBeVisible();

  await page.getByRole("link", { name: "Vendors" }).click();
  await expect(page).toHaveURL(/\/admin\/vendors/);
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test("admin desktop menampilkan sidebar tetap", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page);
  await expect(page.getByRole("button", { name: "Buka menu admin" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Menu admin" })).toBeVisible();
});

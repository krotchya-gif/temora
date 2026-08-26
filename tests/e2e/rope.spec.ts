import { expect, test } from "@playwright/test";

// Task showcase — docs/qa-report.md §7 — uji objektif fisika tali momen di landing publik.
// Tidak butuh backend/seed (halaman marketing), tapi tetap ikut gate E2E
// agar konsisten dengan konvensi task 016.
test.skip(!process.env.E2E_ENABLED, "E2E aktif hanya dengan E2E_ENABLED=1");

async function trackX(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="rope-viewport"] > div');
    const m = new DOMMatrixReadOnly(getComputedStyle(el as Element).transform);
    return m.m41; // translateX
  });
}

async function dragLeft(page: import("@playwright/test").Page): Promise<void> {
  const vp = page.getByTestId("rope-viewport");
  await vp.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300); // tunggu entrance animation whileInView
  const box = (await vp.boundingBox())!;
  const y = box.y + Math.min(box.height / 2, 180);
  const startX = box.x + box.width * 0.85;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  for (let i = 1; i <= 14; i++) {
    await page.mouse.move(startX - i * 35, y);
    await page.waitForTimeout(10);
  }
  await page.mouse.up();
}

test.describe("tali momen — fisika rope", () => {
  test("drag menggeser track + inersia meluncur setelah lepas", async ({ page }) => {
    await page.goto("/");
    await dragLeft(page);

    const afterRelease = await trackX(page);
    expect(afterRelease).toBeLessThan(-150); // geser signifikan

    // Inersia: posisi masih berubah sesaat setelah mouse dilepas.
    await page.waitForTimeout(120);
    const gliding = await trackX(page);
    expect(gliding).toBeLessThan(afterRelease - 15);
  });

  test("reduced-motion: drag tetap berfungsi, glide lebih pendek", async ({ browser }) => {
    // reducedMotion bukan fixture test.use di versi ini — lewat newContext.
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await dragLeft(page);

    const afterRelease = await trackX(page);
    expect(afterRelease).toBeLessThan(-100); // drag 1:1 tetap jalan
    await context.close();
  });
});

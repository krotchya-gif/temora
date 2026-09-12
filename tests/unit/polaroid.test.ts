import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { renderPolaroid } from "@/lib/polaroid";

async function sample(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: "#8B7355" },
  }).jpeg().toBuffer();
}

describe("renderPolaroid", () => {
  it.each([
    [1200, 800, "landscape"],
    [800, 1200, "portrait"],
  ])("mempertahankan orientasi %s×%s (%s) tanpa crop", async (width, height) => {
    const output = await renderPolaroid({
      image: await sample(width as number, height as number),
      eventName: "Engagement Maya & Reza",
      caption: "Cincin diputar, tangan gemetar bahagia.",
    });
    const metadata = await sharp(output).metadata();
    expect(metadata.width).toBeGreaterThan(width as number);
    expect(metadata.height).toBeGreaterThan(height as number);
    expect(metadata.format).toBe("jpeg");
  });

  it("merender caption panjang dan karakter markup dengan aman", async () => {
    const output = await renderPolaroid({
      image: await sample(900, 1200),
      eventName: "Mabar <Temora> & Teman",
      caption: `"Dekat" & hangat ${"bersama ".repeat(30)}`,
    });
    expect(output.byteLength).toBeGreaterThan(10_000);
  });

  it("membuat kartu kutipan untuk moment tanpa foto", async () => {
    const output = await renderPolaroid({
      eventName: "Temora Night",
      caption: "Malam yang akan selalu dekat.",
    });
    const metadata = await sharp(output).metadata();
    expect(metadata.width).toBeGreaterThan(1200);
    expect(metadata.height).toBeGreaterThan(1180);
    expect(metadata.height).toBeGreaterThan(metadata.width ?? 0);
  });
});

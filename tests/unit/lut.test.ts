import { describe, expect, it } from "vitest";
import { buildHald, parseCube } from "@/lib/ai/lut";

// .cube ukuran 2 (2³ = 8 titik) cukup untuk uji parse & atlas.
const CUBE_2 = `# komentar bebas
TITLE "test"
LUT_3D_SIZE 2
DOMAIN_MIN 0.0 0.0 0.0
DOMAIN_MAX 1.0 1.0 1.0
0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0
1.0 1.0 1.0`;

describe("parseCube", () => {
  it("membaca ukuran dan jumlah titik sesuai size³", () => {
    const lut = parseCube(CUBE_2);
    expect(lut.size).toBe(2);
    expect(lut.data.length).toBe(2 ** 3 * 3);
  });

  it("menyimpan titik dalam urutan b-major (b,g,r)", () => {
    const lut = parseCube(CUBE_2);
    // b=1, g=1, r=1 → titik terakhir
    expect(lut.data.at(-3)).toBeCloseTo(1);
    expect(lut.data.at(-1)).toBeCloseTo(1);
    // b=0, g=0, r=1
    expect(lut.data[3]).toBeCloseTo(1);
  });

  it("menolak LUT tidak valid (kurang titik)", () => {
    expect(() => parseCube("LUT_3D_SIZE 4\n0 0 0\n1 1 1")).toThrow();
  });
});

describe("buildHald", () => {
  it("atlas HALD: grid = ceil(sqrt(size)), dimensi grid*size", () => {
    const lut = parseCube(CUBE_2);
    const hald = buildHald(lut);
    // grid = ceil(sqrt(2)) = 2 → atlas 4×4
    expect(hald.width).toBe(4);
    expect(hald.height).toBe(4);
    expect(hald.data.length).toBe(4 * 4 * 3);
  });

  it("nilai texel (0..255) konsisten dengan data sumber", () => {
    const lut = parseCube(CUBE_2);
    const hald = buildHald(lut);
    // b=1 → blok (1 % 2, 1 / 2) = (1, 0); r=1,g=1 → texel (1*2+1, 0*2+1)=(3,1)
    const idx = (1 * hald.width + 3) * 3;
    expect(hald.data[idx]).toBe(255);
    expect(hald.data[idx + 2]).toBe(255);
  });
});
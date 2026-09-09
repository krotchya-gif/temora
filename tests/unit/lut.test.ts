import { readFileSync } from "node:fs";
import catalog from "../../src/lib/ai/lut-catalog.json";
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

// Cube Adobe Photoshop (urutan R-outer, B-middle, G-inner). Baris diurut
// (r,b,g): baris ke-i bernilai (i*0.1, 0, 0) → texel atlas membuktikan indeks.
const CUBE_2_RBG = `#Created by: Adobe Photoshop Export Color Lookup Plugin
TITLE "test"
LUT_3D_SIZE 2
DOMAIN_MIN 0.0 0.0 0.0
DOMAIN_MAX 1.0 1.0 1.0
0.0 0.0 0.0
0.1 0.0 0.0
0.2 0.0 0.0
0.3 0.0 0.0
0.4 0.0 0.0
0.5 0.0 0.0
0.6 0.0 0.0
0.7 0.0 0.0`;

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

  it("memakai red-fastest juga untuk header Photoshop", () => {
    const lut = parseCube(CUBE_2_RBG);
    expect(lut.order).toBe("bgr");
    // file b-major tetap "bgr"
    expect(parseCube(CUBE_2).order).toBe("bgr");
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

  it("Photoshop tetap memakai indeks (b*size+g)*size+r", () => {
    const lut = parseCube(CUBE_2_RBG);
    const hald = buildHald(lut);
    // input (r,g,b) → baris file idx=(r*S+b)*S+g → texel atlas (gx=r, gy=g,
    // block=bz=b). Nilai baris = (idx*0.1, 0, 0).
    const at = (r: number, g: number, b: number) => {
      const x = (b % 2) * 2 + r;
      const y = Math.floor(b / 2) * 2 + g;
      return hald.data[(y * hald.width + x) * 3];
    };
    expect(at(1, 1, 1)).toBe(Math.round(0.7 * 255) - 1); // float32 0.7 → 178
    expect(at(1, 0, 0)).toBe(Math.round(0.1 * 255)); // idx 4
    expect(at(0, 0, 1)).toBe(Math.round(0.4 * 255)); // idx 2
    expect(at(0, 1, 1)).toBe(Math.round(0.6 * 255)); // idx 3
    expect(at(0, 1, 0)).toBe(Math.round(0.2 * 255)); // idx 1
  });
});

describe("LUT regression", () => {
  it("ignores numeric comments, titles, and trailing whitespace", () => {
    const plain = parseCube(CUBE_2);
    const noisy = parseCube('# Copyright 2017 RocketStock\nTITLE "Film 400 test"\n' + CUBE_2 + '\n # 2026\n');
    expect(noisy.data).toEqual(plain.data);
  });
  it("rejects excess points, non-finite numbers, and unsupported domains", () => {
    expect(() => parseCube(CUBE_2 + '\n0 0 0')).toThrow();
    expect(() => parseCube(CUBE_2.replace('1.0 1.0 1.0', 'NaN 1 1'))).toThrow();
    expect(() => parseCube(CUBE_2.replace('DOMAIN_MIN 0.0 0.0 0.0', 'DOMAIN_MIN -1 0 0'))).toThrow();
  });
  it("clamps out-of-gamut data instead of wrapping bytes", () => {
    const lut = parseCube(CUBE_2);
    lut.data[0] = -0.1; lut.data[1] = 1.1;
    expect([...buildHald(lut).data.slice(0, 2)]).toEqual([0, 255]);
  });
  it("loads every curated asset with the correct first RGB triplet", () => {
    for (const def of catalog) {
      const text = readFileSync('public/luts/' + def.file, 'utf8');
      const lut = parseCube(text);
      const first = text.split('\n').map(l => l.split('#')[0].trim()).find(l => /^[-+.\d]/.test(l))!;
      expect([...lut.data.slice(0, 3)]).toEqual([...Float32Array.from(first.split(/\s+/).map(Number))]);
    }
    expect(JSON.parse(readFileSync('public/luts/manifest.json', 'utf8'))).toEqual(catalog);
  });
});

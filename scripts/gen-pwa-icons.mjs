// Generate icon PWA TEMORA — PNG encoder murni Node (zlib bawaan, tanpa dependency).
// Desain (design-system §8): monogram "T" putih di lingkaran dusty-blue (#8FA8B8),
// latar penuh bg-base (#F9F6F1). Supersample 4x untuk anti-aliasing.
//
// Pakai: node scripts/gen-pwa-icons.mjs  →  public/icons/*.png
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "icons");

const BG = [0xf9, 0xf6, 0xf1];
const CIRCLE = [0x8f, 0xa8, 0xb8];
const T_COLOR = [0xff, 0xff, 0xff];

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0;
    for (let x = 0; x < width; x++) {
      const i = y * (1 + width * 3) + 1 + x * 3;
      raw[i] = rgb[y * width + x][0];
      raw[i + 1] = rgb[y * width + x][1];
      raw[i + 2] = rgb[y * width + x][2];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Rounded rect coverage di koordinat supersampled (u,v) ∈ [0,1].
function inRoundedRect(u, v, x0, y0, x1, y1, r) {
  const cx = Math.min(Math.max(u, x0 + r), x1 - r);
  const cy = Math.min(Math.max(v, y0 + r), y1 - r);
  const dx = u - cx;
  const dy = v - cy;
  return dx * dx + dy * dy <= r * r;
}

function render(size) {
  const ss = 4;
  const rgb = new Array(size * size);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = (px + (sx + 0.5) / ss) / size;
          const v = (py + (sy + 0.5) / ss) / size;
          let color = BG;
          const cx = u - 0.5;
          const cy = v - 0.5;
          if (cx * cx + cy * cy <= 0.38 * 0.38) {
            color = CIRCLE;
            const inBar = inRoundedRect(u, v, 0.31, 0.36, 0.69, 0.46, 0.012);
            const inStem = inRoundedRect(u, v, 0.45, 0.46, 0.55, 0.65, 0.008);
            if (inBar || inStem) color = T_COLOR;
          }
          r += color[0];
          g += color[1];
          b += color[2];
        }
      }
      rgb[py * size + px] = [Math.round(r / 16), Math.round(g / 16), Math.round(b / 16)];
    }
  }
  return encodePng(size, size, rgb);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [192, 512, 180]) {
  const file = join(OUT_DIR, size === 180 ? "apple-touch-icon-180.png" : `icon-${size}.png`);
  writeFileSync(file, render(size));
  console.log(`icon: ${file}`);
}
const maskable = join(OUT_DIR, "maskable-512.png");
writeFileSync(maskable, render(512));
console.log(`icon: ${maskable} (safe zone 80% — lingkaran radius 0.38 < 0.40)`);
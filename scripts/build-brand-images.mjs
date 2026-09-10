// Turunan aset brand dari logo (tanpa dependency — zlib bawaan Node).
// Desain (design-system §8, BRAND.md §8): lockup wordmark + tagline di atas
// warm ivory (#F9F6F1, token bg-base) — bukan hex baru.
//
// Pakai: node scripts/build-brand-images.mjs
//   public/logos/logo.png (800x457, RGBA)
//     → public/og.png (1200x630, social preview scraper WA/FB/X)
//     → public/icons/maskable-512.png (512x512, safe zone 80% untuk adaptive icon)
// Sumber + script ini yang menjadi acuan; jangan edit hasil generate manual.
import { inflateSync, deflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IVORY = [0xf9, 0xf6, 0xf1];

// ---- PNG decode minimal (8-bit, truecolor/truecolor+alpha, non-interlaced) ----
function decodePng(path) {
  const buf = readFileSync(join(ROOT, path));
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(sig)) throw new Error(`${path}: bukan PNG`);
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) {
    throw new Error(
      `${path}: format tak didukung (bitDepth=${bitDepth} colorType=${colorType} interlace=${interlace})`,
    );
  }
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const rgba = Buffer.alloc(width * height * 4);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    for (let x = 0; x < stride; x++) {
      const px = (x / channels) | 0;
      const c = x % channels;
      // Tetangga dalam ruang byte scanline: left = byte x-channels baris ini
      // (piksel px-1), up = byte x baris atas, upLeft = byte x-channels atas.
      const left = x >= channels ? rgba[(y * width + (px - 1)) * 4 + c] : 0;
      const up = y > 0 ? rgba[((y - 1) * width + px) * 4 + c] : 0;
      const upLeft = x >= channels && y > 0 ? rgba[((y - 1) * width + (px - 1)) * 4 + c] : 0;
      // Paeth predictor.
      const pa = Math.abs(up - upLeft);
      const pb = Math.abs(left - upLeft);
      const pc = Math.abs(left + up - 2 * upLeft);
      const paeth = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      let v = raw[p++];
      if (filter === 1) v = (v + left) & 0xff;
      else if (filter === 2) v = (v + up) & 0xff;
      else if (filter === 3) v = (v + ((left + up) >> 1)) & 0xff;
      else if (filter === 4) v = (v + paeth) & 0xff;
      const idx = (y * width + px) * 4 + c;
      rgba[idx] = v;
    }
    // Alpha default penuh untuk sumber tanpa channel alpha.
    if (channels === 3) {
      for (let px = 0; px < width; px++) rgba[(y * width + px) * 4 + 3] = 255;
    }
  }
  return { width, height, rgba };
}

// ---- Bilinear resample RGBA ----
function resample(src, dstW, dstH) {
  const out = Buffer.alloc(dstW * dstH * 4);
  for (let y = 0; y < dstH; y++) {
    const sy = Math.min(src.height - 1, (y * src.height) / dstH);
    const y0 = sy | 0;
    const y1 = Math.min(src.height - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < dstW; x++) {
      const sx = Math.min(src.width - 1, (x * src.width) / dstW);
      const x0 = sx | 0;
      const x1 = Math.min(src.width - 1, x0 + 1);
      const fx = sx - x0;
      for (let c = 0; c < 4; c++) {
        const v00 = src.rgba[(y0 * src.width + x0) * 4 + c];
        const v10 = src.rgba[(y0 * src.width + x1) * 4 + c];
        const v01 = src.rgba[(y1 * src.width + x0) * 4 + c];
        const v11 = src.rgba[(y1 * src.width + x1) * 4 + c];
        out[(y * dstW + x) * 4 + c] = Math.round(
          v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy,
        );
      }
    }
  }
  return { width: dstW, height: dstH, rgba: out };
}

// ---- Flatten ke kanvas ivory + encode PNG RGB ----
function crc32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}
const CRC_TABLE = crc32Table();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
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
function encodeFlatPng(width, height, rgba, bg) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0;
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      const a = rgba[s + 3] / 255;
      const i = y * (1 + width * 3) + 1 + x * 3;
      raw[i] = Math.round(rgba[s] * a + bg[0] * (1 - a));
      raw[i + 1] = Math.round(rgba[s + 1] * a + bg[1] * (1 - a));
      raw[i + 2] = Math.round(rgba[s + 2] * a + bg[2] * (1 - a));
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- 1. OG 1200x630: lockup muat dengan margin di atas ivory ----
const logo = decodePng("public/logos/logo.png");
const ogScale = Math.min((1200 - 160) / logo.width, (630 - 140) / logo.height);
const ogLogo = resample(logo, Math.round(logo.width * ogScale), Math.round(logo.height * ogScale));
const ogCanvas = Buffer.alloc(1200 * 630 * 4);
for (let i = 0; i < 1200 * 630; i++) {
  ogCanvas[i * 4] = IVORY[0];
  ogCanvas[i * 4 + 1] = IVORY[1];
  ogCanvas[i * 4 + 2] = IVORY[2];
  ogCanvas[i * 4 + 3] = 255;
}
const ogX = Math.round((1200 - ogLogo.width) / 2);
const ogY = Math.round((630 - ogLogo.height) / 2);
for (let y = 0; y < ogLogo.height; y++) {
  for (let x = 0; x < ogLogo.width; x++) {
    const s = (y * ogLogo.width + x) * 4;
    const a = ogLogo.rgba[s + 3] / 255;
    const d = ((ogY + y) * 1200 + (ogX + x)) * 4;
    ogCanvas[d] = Math.round(ogLogo.rgba[s] * a + ogCanvas[d] * (1 - a));
    ogCanvas[d + 1] = Math.round(ogLogo.rgba[s + 1] * a + ogCanvas[d + 1] * (1 - a));
    ogCanvas[d + 2] = Math.round(ogLogo.rgba[s + 2] * a + ogCanvas[d + 2] * (1 - a));
    ogCanvas[d + 3] = 255;
  }
}
writeFileSync(join(ROOT, "public", "og.png"), encodeFlatPng(1200, 630, ogCanvas, IVORY));
console.log(`og: public/og.png (1200x630, logo ${ogLogo.width}x${ogLogo.height} di tengah ivory)`);

// ---- 2. Maskable 512: lockup 80% safe zone di atas ivory full-bleed ----
const app = decodePng("public/icons/web-app-manifest-512x512.png");
const mScale = Math.min((512 * 0.8) / app.width, (512 * 0.8) / app.height);
const mLogo = resample(app, Math.round(app.width * mScale), Math.round(app.height * mScale));
const mCanvas = Buffer.alloc(512 * 512 * 4);
for (let i = 0; i < 512 * 512; i++) {
  mCanvas[i * 4] = IVORY[0];
  mCanvas[i * 4 + 1] = IVORY[1];
  mCanvas[i * 4 + 2] = IVORY[2];
  mCanvas[i * 4 + 3] = 255;
}
const mX = Math.round((512 - mLogo.width) / 2);
const mY = Math.round((512 - mLogo.height) / 2);
for (let y = 0; y < mLogo.height; y++) {
  for (let x = 0; x < mLogo.width; x++) {
    const s = (y * mLogo.width + x) * 4;
    const a = mLogo.rgba[s + 3] / 255;
    const d = ((mY + y) * 512 + (mX + x)) * 4;
    mCanvas[d] = Math.round(mLogo.rgba[s] * a + mCanvas[d] * (1 - a));
    mCanvas[d + 1] = Math.round(mLogo.rgba[s + 1] * a + mCanvas[d + 1] * (1 - a));
    mCanvas[d + 2] = Math.round(mLogo.rgba[s + 2] * a + mCanvas[d + 2] * (1 - a));
    mCanvas[d + 3] = 255;
  }
}
writeFileSync(join(ROOT, "public", "icons", "maskable-512.png"), encodeFlatPng(512, 512, mCanvas, IVORY));
console.log(`icon: public/icons/maskable-512.png (safe zone 80% di atas ivory)`);

// ---- 3. apple-touch-icon: iOS menempel transparan ke hitam (tanpa alpha
// blending) — flatten ke ivory opak agar tidak jadi kotak hitam di Home Screen.
const touch = decodePng("public/icons/apple-touch-icon.png");
writeFileSync(
  join(ROOT, "public", "icons", "apple-touch-icon.png"),
  encodeFlatPng(touch.width, touch.height, touch.rgba, IVORY),
);
console.log(`icon: public/icons/apple-touch-icon.png (flatten ivory ${touch.width}x${touch.height})`);

// ---- 4. Ikon PWA 192/512: launcher Android menaruh ikon `any` apa adanya di
// atas wallpaper — teks gelap tenggelam di wallpaper gelap. Flatten ke ivory
// agar terbaca di semua background (konsisten tema terang TEMORA).
for (const pwa of ["public/icons/web-app-manifest-192x192.png", "public/icons/web-app-manifest-512x512.png"]) {
  const img = decodePng(pwa);
  writeFileSync(join(ROOT, pwa), encodeFlatPng(img.width, img.height, img.rgba, IVORY));
  console.log(`icon: ${pwa} (flatten ivory ${img.width}x${img.height})`);
}

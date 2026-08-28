#!/usr/bin/env node
// Sync manifest filter LUT — scan public/luts/*.cube|*.CUBE → manifest.json.
//
// Pemakaian: node scripts/sync-luts.mjs
// Tambah filter = drop file .cube ke public/luts/ lalu jalankan script ini
// (tanpa ubah kode). Manifest dibaca runtime oleh src/lib/ai/lut.ts.
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "public/luts";

// Label kustom untuk file kurasi (film emulation, MIT); selain itu pakai
// nama file apa adanya.
const LABEL_OVERRIDES = {
  "portra-400.cube": "Portra Hangat",
  "fuji-400h.cube": "Fuji Lembut",
  "ektar-100.cube": "Ektar Cerah",
  "velvia-50.cube": "Velvia Pop",
  "ektachrome-vs.cube": "Ektachrome",
  "trix-400.cube": "Tri-X Hitam Putih",
  "fp100c.cube": "Instan Retro",
  "agfa-vista-200.cube": "Vista 200",
};

function slug(name) {
  return name
    .replace(/\.(cube|CUBE)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const files = readdirSync(DIR)
  .filter((f) => /\.(cube|CUBE)$/.test(f))
  .sort((a, b) => {
    const ao = LABEL_OVERRIDES[a] ? 0 : 1;
    const bo = LABEL_OVERRIDES[b] ? 0 : 1;
    return ao - bo || a.localeCompare(b, "en", { sensitivity: "base" });
  });

const manifest = files.map((file) => ({
  id: slug(file),
  label: LABEL_OVERRIDES[file] ?? file.replace(/\.(cube|CUBE)$/i, ""),
  file,
}));

writeFileSync(join(DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`manifest.json: ${manifest.length} filter`);
#!/usr/bin/env node
// Publish only the reviewed catalog; adding an asset never enables it.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const catalog = JSON.parse(readFileSync("src/lib/ai/lut-catalog.json", "utf8"));
for (const lut of catalog) {
  if (!existsSync("public/luts/" + lut.file)) throw new Error("Missing LUT: " + lut.file);
}
writeFileSync("public/luts/manifest.json", JSON.stringify(catalog, null, 2) + "\n");
console.log(catalog.length + " curated filters");

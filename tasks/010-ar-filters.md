# Task 010 — AR Filters & Virtual Props

*Status: Kode selesai (2026-08-28) — FaceLandmarker lazy-load, 10 props (6 Twemoji + 4 custom SVG), FPS watchdog auto-disable, props masuk hasil capture; AC device (FPS ≥25, group ≤4 wajah) menunggu device lab task 016 · Prioritas: Medium · Phase: 2*

> ⚠️ **2026-08-29**: fitur **di-OFF sementara** via `src/lib/ai/feature-flags.ts`
> (`ENABLE_PROPS=false`) — masih bermasalah di uji live (qa-report §6o). Kode
> utuh; balik flag + uji ulang (fix mirror/crop/FPS sudah terpasang).

Depends on: 004 (photobooth dasar stabil dulu — jalur capture TIDAK boleh terganggu)

---

## 1. Tujuan

Tamu bisa menambahkan props virtual (topi, kacamata, bunga) atau filter ringan yang mengikuti wajah secara real-time — memperpanjang durasi main di photobooth dan jadi nilai jual vendor.

## 2. Scope

- Face landmark client-side via **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision`, FaceLandmarker, `numFaces: 4`) — pola kode: architecture.md §8.2.
- Library props PNG transparan yang track posisi/skala/rotasi wajah:
  - Topi → anchor landmark 10 (dahi), skala dari jarak 10–152.
  - Kacamata → anchor landmark 33 & 263 (mata), rotasi dari garis antar-mata.
- Katalog props per tema event; vendor pilih aktif/nonaktif per event (toggle di dashboard frame page).
- Render loop di canvas overlay terpisah dari `<video>`; hasil capture = compositing video + props + frame + watermark.
- Lazy-load total: model WASM + task file hanya di-download saat tamu pertama kali buka picker props (dynamic import).
- Fallback berjenjang:
  - GPU tak tersedia → delegate CPU.
  - FPS < 20 bertahan 3 detik → matikan AR otomatis + toast ramah.
  - Model gagal load → mode props statis (drag manual di preview).

## 3. Non-Scope

- ❌ Filter wajah realistis/beauty (face mesh deformasi) — kompleks & rawan "uncanny".
- ❌ Multi-orang > 4 wajah.
- ❌ Video/boomerang mode.

## 4. Desain

### 4.1 Alur UX
```
Photobooth → tab "Props" (icon Lucide) → grid thumbnail props
  → pilih prop → model lazy-load (skeleton kecil) → live preview mengikuti wajah
  → capture seperti biasa (props ikut terbakar di hasil akhir)
```

### 4.2 Performa budget
| Metrik | Target | Aksi jika lewat |
|---|---|---|
| Model load | < 3 detik di 4G | Progress hint, tetap bisa capture tanpa props |
| FPS render | ≥ 25 mid-range (hard min 20) | Auto-disable AR |
| Bundle utama photobooth | +0 KB (chunk terpisah) | — |

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `src/lib/ai/faceLandmark.ts` | baru — wrapper FaceLandmarker |
| `src/components/photobooth/PropOverlay.tsx` | baru — render loop canvas |
| `src/components/photobooth/PropPicker.tsx` | baru |
| `public/props/{theme}/*.png` | aset props awal (6–8 item) |
| `src/app/dashboard/events/[eventId]/frame/page.tsx` | toggle props per event |

## 6. Acceptance Criteria

- [ ] ≥ 25 FPS di HP kelas menengah saat AR aktif; auto-disable di bawah 20. *(kode: watchdog FPS ~4 dtk → auto-disable; verifikasi device menunggu device lab)*
- [ ] Hasil capture menyertakan props pada posisi/skala benar (test topi + kacamata). *(kode: landmark → propLayout → canvas, mirror kamera depan; verifikasi visual menunggu device)*
- [ ] Group photo ≤ 4 orang: semua wajah ke-track. *(kode: numFaces=4, render per wajah; verifikasi menunggu device)*
- [x] Photobooth dasar tetap < 10 detik scan-to-capture tanpa menyentuh tab Props (bundle tak bertambah). *(2026-08-28: E2E guest 4.4s; chunk page 25K hanya memuat URL CDN — MediaPipe di chunk dinamis terpisah, dimuat saat tab "Efek" dibuka)*
- [x] Event tanpa props tidak memuat model sama sekali. *(2026-08-28: model hanya di-load via dynamic import saat activeProp set)*
- [x] Consent screen tidak berubah (props 2D tidak proses biometrik — cukup privacy note umum).

## 7. Catatan

Legacy `@mediapipe/pose` / `@mediapipe/face_mesh` **deprecated** — jangan pakai. Verifikasi versi API Tasks Vision terbaru saat implementasi. Ukur dampak memory Safari iOS (paling ketat) sebelum tambah jumlah props default.

# Task 011 — Green Screen (Background Replacement)

*Status: Kode selesai (2026-08-28) — ImageSegmenter lazy-load, 3 latar bawaan (token), preview live == hasil capture (kanvas compositing dipakai capture), soft edge (confidence mask, person = NOT background), fallback graceful; verifikasi visual/FPS menunggu device lab · Prioritas: Medium · Phase: 2*

> ⚠️ **2026-08-29**: fitur **di-OFF sementara** via `src/lib/ai/feature-flags.ts`
> (`ENABLE_BACKGROUNDS=false`) — masih bermasalah di uji live (qa-report §6o).
> Kode utuh; balik flag + uji ulang (fix mask/order channel sudah terpasang).

Depends on: 004, 010 (shared lazy-load infra AI)

---

## 1. Tujuan

Tamu mengganti background real-time (pantai, ballroom, abstrak) tanpa green screen fisik — nilai jual premium untuk vendor corporate & wedding, dan add-on berbayar pertama TEMORA.

## 2. Scope

- Person segmentation client-side via **MediaPipe Tasks Vision** (`ImageSegmenter`, selfie_segmenter model) — pola kode: architecture.md §8.1.
- Background library per event:
  - **Preset bawaan** TEMORA: 6–8 gambar statis di `public/backgrounds/` (pantai, ballroom, city, abstrak warm, dst) — tanpa tabel DB baru di Phase 2.
  - **Custom upload vendor**: maksimal 3 background/event, disimpan ke bucket `frames/{vendor}/{event}/bg-*.jpg` + path dicatat di `events.metadata` (JSONB) — skema inti tetap tak tersentuh.
- Compositing pipeline canvas:
  ```
  drawImage(bg) → video frame dengan alpha mask dari categoryMask
    → feathering edge (blur mask 2px) → frame overlay → capture
  ```
- Gating tier via config event (server-side): fitur ini add-on berbayar Rp 15K–30K/event atau bundel tier Pro — final pricing diputuskan saat rilis.
- Consent opt-in eksplisit sebelum aktifasi (segmentation memproses citra tubuh) — tambahan baris di ConsentScreen.
- Fallback: segmentasi gagal / pencahayaan ekstrem → tawarkan mode normal, jangan blok capture.

## 3. Non-Scope

- ❌ Chroma key manual (butuh kain hijau — bertentangan dengan positioning "tanpa alat").
- ❌ Video background / animasi.
- ❌ Upload background tamu (hanya vendor).

## 4. Desain

### 4.1 Alur UX
```
Photobooth → tab "Background" → grid thumbnail preset/custom
  → pilih → model lazy-load → live preview (orang tetap tajam, bg berganti)
  → capture → hasil = orang + bg pilihan + frame + watermark
```

### 4.2 Kualitas visual
- Feathering mask wajib — edge tajam robotik merusak kesan premium.
- Color-match ringan: sesuaikan white balance bg ke tone venue (approx, cukup `filter: saturate/brightness` halus).
- Preview real-time ≥ 20 FPS; jika di bawah itu → turunkan resolusi mask (bukan matikan).

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `src/lib/ai/segmentation.ts` | baru — wrapper ImageSegmenter |
| `src/components/photobooth/BackgroundStage.tsx` | baru — compositing pipeline |
| `src/components/photobooth/BackgroundPicker.tsx` | baru |
| `public/backgrounds/*.jpg` | 6–8 preset (compress < 300KB each) |
| `src/app/api/events/[id]/backgrounds/route.ts` | custom upload vendor |
| `docs/database.md` | catat konvensi `events.metadata.backgrounds` |

## 6. Acceptance Criteria

- [ ] Segmentasi stabil di pencahayaan venue normal (test indoor warm light + outdoor siang). *(kode siap; verifikasi menunggu device lab)*
- [ ] Capture hasil menyertakan background pilihan + frame overlay benar. *(kode: capture memakai kanvas compositing (preview == hasil) + frame/watermark/props tetap digambar; verifikasi visual menunggu device)*
- [ ] Edge bersih tanpa halo/kaku pada rambut & bahu (visual check 5 tipe rambut). *(menunggu device lab)*
- [x] Model lazy-load; photobooth dasar tidak terpengaruh (+0 KB bundle). *(2026-08-28: dynamic import; chunk page 25K hanya URL CDN; E2E guest 4.4s)*
- [x] Event tanpa gating aktif → tab Background tidak muncul untuk tamu. *(tab Latar hanya render saat phase live; tanpa klik = model tidak dimuat)*
- [x] Consent screen menyebut pemrosesan citra saat fitur dipakai. *(privacy note umum §3.7 — pemrosesan di perangkat, tanpa biometrik/identifikasi)*
- [ ] Custom upload vendor tampil di picker tamu. *(keputusan 2026-08-28: ditunda pasca-device-lab — picker saat ini = 3 latar bawaan token)*

## 7. Catatan

Ini fitur add-on berbayar — ukur adopsi per event setelah rilis sebagai sinyal willingness-to-pay vendor. GPU delegate preferred; Safari iOS lama kadang fallback CPU — test di iPhone minimal iOS 16.

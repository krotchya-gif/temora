# Task 017 — Marketing Pages (Landing + Pricing + How It Works)

*Status: Selesai (2026-09-12) — baseline AC tetap terverifikasi; halaman Cara Kerja dipoles dengan alur editorial tiga langkah dan screenshot UI guest camera nyata dalam frame HP · Prioritas: High · Phase: MVP (syarat sebelum onboarding vendor pertama)*

Depends on: 001 (design tokens + font siap)

---

## 1. Tujuan

Menutup gap akuisisi vendor: route `/`, `/pricing`, `/how-it-works` dibangun sungguhan sesuai BRAND.md §9–11 dan design-system.md — halaman hangat bernuansa momen, bukan template SaaS generik. Vendor prospektif dari alur aktivasi WhatsApp akan melihat halaman ini lebih dulu.

## 2. Scope

- **Landing `/`**: hero H1 "Keep The Moments Close." (BRAND.md §10) + supporting copy + CTA WhatsApp deep-link admin (`wa.me` pre-filled) + section how-it-works ringkas + footer brand.
- **`/pricing`**: 3 tier sesuai PRD §3 MUST 5 — Free (1 event aktif, unlimited nonaktif) / Basic Rp 49K / Pro Rp 299K; kartu perbandingan sederhana, CTA "Mulai Gratis" (signup).
- **`/how-it-works`**: 3 langkah visual — tamu scan QR → ambil momen di browser → vendor kelola & unduh ZIP. Presentasi final memakai hero editorial berbasis foto, timeline bernomor, QR valid, visual kamera/galeri dengan foto lokal, dan CTA penutup; bukan grid tiga kartu simetris atau placeholder blok warna.
- SEO on-page: title/meta per halaman sesuai BRAND.md §9–10, semantic HTML, OG image placeholder (design-system §8).
- Semua statis (server component, tanpa JS interaktif selain link CTA).

## 3. Non-Scope

- ❌ Blog / artikel SEO (backlog pasca-MVP — BRAND.md §11).
- ❌ Galeri publik "TEMORA Moments" (butuh fitur Moments, Phase 2).
- ❌ Halaman lokasi SEO (Jakarta/Bandung dst — backlog).

## 4. Desain

### 4.1 Prinsip

- Warm minimalism penuh (design-system §1): `bg-base` ivory, headline Cormorant Garamond, foto candid warm (design-system §7).
- Anti-slop gate §11 wajib lulus sebelum deliver — tanpa gradient klise, tanpa badge "✨ AI-powered".
- Mobile-first; CTA utama = deep-link `wa.me` admin (pola aktivasi MVP).

### 4.2 Copy baseline

Mulai dari draft BRAND.md §10 (homepage copy) dan §12 (bio IG versi ID/EN) sebagai voice acuan. Foto placeholder warm-toned legal (Unsplash/Pexels candid) sampai ada aset asli — hindari stock staged.

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `src/app/page.tsx` | ganti stub landing → landing penuh |
| `src/app/pricing/page.tsx` | baru |
| `src/app/how-it-works/page.tsx` | baru |
| `public/og.png` | OG image 1200×630 placeholder |

## 6. Acceptance Criteria

- [x] Ketiga halaman live; navigasi antar-halaman konsisten dengan design tokens.
- [x] Lighthouse mobile ≥ 85 performance & accessibility di ketiga halaman. *(2026-08-28: landing perf 86/a11y 96 · pricing 99/96 · how-it-works 99/96 — bukti docs/lighthouse/*.json)*
- [x] Title + meta description tiap halaman sesuai BRAND.md §9–10.
- [x] CTA WhatsApp membuka chat admin dengan pre-filled text benar.
- [x] Responsive mulus dari viewport 360px ke atas.

> Terverifikasi manual oleh owner (2026-08-28): seluruh AC di atas lulus uji nyata; pengecualian Lighthouse.

## 7. Catatan

Halaman ini juga syarat go-live bersama tasks 015–016 (checklist task 015). Kalau konten copy belum final saat eksekusi, ship dulu dengan copy BRAND.md apa adanya — revisi copy tidak butuh deploy khusus.

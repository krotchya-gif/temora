# TEMORA — Virtual Photobooth SaaS

> **Keep the moments close.**

Platform SaaS virtual photobooth untuk vendor event (WO, fotografer, EO): tamu scan QR → ambil foto berbingkai kustom dari browser HP → vendor kelola galeri & unduh ZIP. Tanpa aplikasi, tanpa alat fisik.

**Folder ini adalah konsolidasi resmi** dari draft `temora/` (dokumen approved) dan `temora-project-files/` (referensi AI, motion, deployment). Folder lama hanya arsip — semua pekerjaan baru di sini.

## Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16 · React 19 · Tailwind CSS 4 · Radix UI |
| Font | Cormorant Garamond · Plus Jakarta Sans · JetBrains Mono |
| Backend | Next.js API Routes (Node.js 20+) |
| Hosting | Hostinger shared — Git deploy (prototipe; build `next build --webpack` + config `next.config.mjs`, lihat architecture.md §2) |
| Database | Supabase (PostgreSQL 15 + RLS) |
| Auth | Supabase Auth |
| Storage | Hostinger media subdomain (`media.temora.site`); Supabase hanya Database/Auth/Realtime |
| Payment | Xendit |
| Notifikasi | WhatsApp Business Cloud API |
| AI (Phase 2) | MediaPipe Tasks Vision (client-side, lazy-load) |
| CI/CD | GitHub Actions + Hostinger Git auto-deploy |
| Monitoring | UptimeRobot · cron-job.org (pinger cron) · log hPanel |

## Struktur

```
Temora Photos/
├── docs/                       ← DESAIN (single source of truth)
│   ├── BRAND.md                    brand foundation TEMORA
│   ├── PRD.md                      visi, fitur MoSCoW, metrik, risiko
│   ├── architecture.md             stack, routes, data flow, AI ref, monitoring
│   ├── design-system.md            tokens, komponen, motion, microcopy, anti-slop
│   ├── database.md                 skema SQL, RLS, storage, retention
│   ├── pendoman.md                 panduan pemakaian aplikasi (role, flow, ops)
│   ├── qa-report.md                log QA + arsip spesifikasi fitur
│   ├── runbook.md                  runbook operasional (rollback, restore, insiden)
│   └── research/
│       ├── competitor-analysis.md  riset Invrame, Photobooth.ID, Framebooth
│       └── seo-admin-reference.md  referensi pola /admin/seo (project lain, adaptasi)
└── tasks/                      ← EKSEKUSI (berurutan)
    ├── 001-setup.md                Next.js + Supabase init          [MVP]
    ├── 002-supabase-schema.md      skema DB + RLS + buckets        [MVP]
    ├── 003-auth-dashboard.md       auth vendor + layout dashboard  [MVP]
    ├── 004-photobooth-page.md      kamera + frame + capture        [MVP]
    ├── 005-qr-code-tables.md       QR per meja + print A4          [MVP]
    ├── 006-gallery-zip.md          galeri + unduh ZIP              [MVP]
    ├── 007-dashboard-events.md     CRUD events                     [MVP]
    ├── 008-xendit-billing.md       tier + invoice + webhook        [MVP]
    ├── 009-whatsapp-integration.md notifikasi WA                   [MVP]
    ├── 010-ar-filters.md           AR props                         [dihapus dari scope]
    ├── 011-green-screen.md         background replacement          [Phase 2 ⚠️ OFF sementara, §6o]
    ├── 012-moments-feature.md      caption + guestbook digital     [Phase 2 ✅ 2026-08-28] ⭐
    ├── 013-sponsorship-slots.md    logo sponsor frame/QR           [Phase 3 ✅ 2026-08-28]
    ├── 014-analytics-dashboard.md  agregat + heatmap               [Phase 3 ✅ 2026-08-28]
    ├── 015-deployment-cicd.md      production + monitoring         [MVP gate]
    ├── 016-testing-qa.md           e2e + device lab + bug bash     [MVP gate]
    ├── 017-marketing-pages.md      landing + pricing + how-it-works [MVP]
    ├── 018-super-admin.md          dashboard superadmin /admin      [MVP+ ✅]
    └── 019-security-hardening.md   hardening + manajemen vendor     [MVP+ ✅]
```

## Urutan Kerja

1. Baca `docs/PRD.md`, lalu docs lain sesuai kebutuhan task.
2. Kerjakan `tasks/` **berurutan** — tiap task punya acceptance criteria; jangan lanjut sebelum checklist penuh.
3. **Launch gate**: tasks 015–017 wajib tuntas sebelum vendor pertama onboarding.
4. Desain berubah? Update docs dulu, baru kode.
5. Catatan (2026-08-26): shell UI statis beberapa halaman dashboard (ringkasan event, galeri event) dibuat **mendahului** eksekusi task-nya sebagai keputusan visual — seluruh acceptance criteria task aslinya tetap wajib diverifikasi penuh saat wiring.

> Docs inti saat ini **v1.5** (database/design-system/PRD/architecture diperbarui 2026-09-12 — setup studio live preview, custom QR card, placeholder kamera tamu, dan hardening kuota upload atomik). Patch logika tier/limit/upload: README §Keputusan Terkunci #13–17.
>
> **Status fitur AI photobooth:** filter warna 3D LUT **aktif** (7 look kurasi — lihat design-system §3.9; manifest `public/luts/manifest.json`, `node scripts/sync-luts.mjs`). AR props dihapus dari produk. Green screen tetap ada di kode namun OFF sementara melalui `src/lib/ai/feature-flags.ts`.

## Keputusan Terkunci

*(2026-08-24, ditambah keputusan konsolidasi & revisi 2026-08-25, patch logika v1.2)*

1. Nama project & brand: **TEMORA**
2. Payment MVP: **Xendit**
3. WhatsApp API di MVP (aktivasi + notifikasi)
4. Fitur Moments: **Phase 2** (differentiator utama vs kompetitor)
5. Logo: placeholder dulu
6. Tipografi: **Cormorant Garamond + Plus Jakarta Sans** (+ JetBrains Mono untuk data)
7. Token warna kanonik: warm ivory `#F9F6F1` + earthy brown `#8B7355` (design-system §2.1)
8. Privasi: tanpa facial recognition; tamu tak bisa baca foto/momen orang lain
9. Skema DB: tabel fase 2 (`moments`, `sponsors`) **tidak dibuat sebelum waktunya** — *diperbarui 2026-08-28: dibuat saat task 012/013 dieksekusi (migrasi 0022+), bukan lebih awal*
10. Fitur tamu simpan/bagikan foto sendiri masuk MVP (Web Share API, tracking `guest_saved_at`)
11. Renewal subscription manual via WA reminder H-3/H-0 — tanpa auto-charge di MVP
12. URL photobooth menerima UUID + slug kustom vendor; QR encode UUID sebagai bentuk kanonik
13. `photo_limit`: NULL = unlimited (Pro); diset saat create event saja, tidak di-sync saat upgrade
14. Watermark Free/Basic wajib default; Pro boleh tanpa watermark (`watermark_text = NULL`) atau memakai teks/posisi custom
14. Free tier: max 1 event **aktif**, unlimited event nonaktif
15. Downgrade ke Free: event aktif tetap jalan; block create/activate baru sampai ≤1 aktif
16. `ends_at` informasi saja — tidak memblokir akses tamu
17. Upload tamu via API service role; dedup offline via `client_upload_id`
18. Tamu anonim di MVP — tanpa nama/email wajib
19. Supabase clients: `client` (browser) · `server` (vendor session) · `admin` (service role)
20. File upload baru disimpan di `media.temora.site`, bukan Supabase Storage. File lama
    di Supabase Storage tidak dimigrasikan karena project masih development/testing.
21. Preset kamera dan filter yang dipilih vendor adalah sumber tampilan tamu; preview
    setup harus memperbarui shell kamera dan treatment warna secara live sebelum save.
22. Kartu QR meja dapat dikustomisasi per event pada template, judul, subjudul, dan
    tagline. Payload QR dan ukuran minimum 4×4 cm tetap locked.

## Referensi

- Riset kompetitor: `docs/research/competitor-analysis.md`
- Kredit aset filter LUT (MIT): `docs/research/lut-credits.md`
- Aturan anti-slop UI: tergabung di `docs/design-system.md` §11


---

## Catatan Setup Test

Konfigurasi test (`vitest.config.ts`, `playwright.config.ts`) **ikut repo**
agar CI reproducible. Artefak hasil (`test-results/`, `playwright-report/`)
tidak dipush.

CI unit test: `npm run test` (vitest). E2E Playwright jalan bila repo variable
`RUN_E2E=true` + secrets Supabase/Xendit sandbox terpasang (docs/qa-report.md).

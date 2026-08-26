# QA Report — TEMORA MVP

> Task 016 · diperbarui 2026-08-26 · Gate launch: 0 blocker / 0 critical terbuka.
>
> **Status lingkungan saat laporan ini ditulis:** key Supabase/Xendit/WhatsApp di
> `.env.local` sengaja diisi belakangan (keputusan eksekusi), sehingga seluruh
> pengujian yang butuh backend live tertandai **PENDING** dengan langkah
> menjalankannya. Unit tests dan build berjalan penuh di lokal.

## Ringkasan gate (task 016 §4.1)

| Kategori | Gate | Status |
|---|---|---|
| Unit tests | Lulus di CI | ✅ 26/26 lulus lokal (`npm run test`) |
| E2E jalur kritis 3/3 | Hijau 2× berturut-turut | ⏳ PENDING — spec siap, jalankan setelah env terisi |
| Device lab Android/iOS | Lolos tanpa blocker | ⏳ PENDING — checklist §3 |
| Lighthouse ≥ 85 mobile photobooth | Terlampir | ⏳ PENDING — butuh instance + data |
| Cross-tenant RLS | Semua ditolak | ⏳ PENDING — prosedur §5 |
| Bug blocker/critical | 0 terbuka | ✅ (semua temuan sudah difix, lihat §6) |

## 1. Unit tests (Vitest) — ✅

`tests/unit/` — 4 file, 26 test:
- `ulid` — format Crockford 26 char, monotonic, unik.
- `rate-limit` — sliding window izin/tolak/reset window.
- `validation` — event create/update (slug immutable, tanggal, pesan ramah),
  tables generate 1–50, `isUuid`, `themeAccent`.
- `wa-xendit` — normalisasi E.164 (9 kasus), verifyCallbackToken constant-time
  termasuk env kosong.

Catatan: util kompresi canvas hidup di dalam `CameraStage.tsx` (tidak diekstrak)
— kebenarannya diliputi E2E guest flow (ukuran hasil ≤800KB diverifikasi server).

## 2. E2E (Playwright) — ⏳ spec siap

`tests/e2e/`: `guest.spec.ts` (consent → capture fake-camera → upload → toast →
Simpan ke HP), `vendor.spec.ts` (login → buat event → generate QR → galeri),
`billing.spec.ts` (checkout sandbox + webhook replay idempoten). Semua gated
oleh `E2E_ENABLED=1`.

Menjalankan setelah `.env.local` terisi:

```bash
# seed minimal: 1 vendor + 1 event aktif + 2 meja (lihat supabase/seed.sql)
export E2E_ENABLED=1
export E2E_EVENT_ID=<uuid-event> E2E_TABLE_ID=<uuid-meja>
export E2E_VENDOR_EMAIL=dev@temora.test E2E_VENDOR_PASSWORD=<password>
npx playwright install chromium
npm run test:e2e   # 2× berturut-turut sesuai gate
```

Billing spec butuh tambahan `XENDIT_SECRET_KEY` + `E2E_XENDIT_INVOICE_ID`
(id subscription pending dari checkout sandbox pertama).

CI: job `e2e` otomatis jalan bila repo variable `RUN_E2E=true` + secrets terpasang.

## 3. Device lab manual — ⏳ PENDING

Checklist (wajib fisik, bukan emulator):

**Android Chrome (mid-range)**
- [ ] Buka link `/p/...` dari kamera HP (QR kartu cetak) — consent tampil
- [ ] Izin kamera granted/denied dua-duanya punya layar ramah
- [ ] Capture → preview develop → Simpan → toast "Momen tersimpan ✨"
- [ ] Simpan ke HP via Web Share sheet
- [ ] Mode pesawat saat Simpan → chip "Menyimpan…" → online lagi → terkirim
- [ ] Orientasi potret & landscape hasil foto benar (tidak rotasi)

**iPhone Safari (iOS ≥ 16)**
- [ ] Sama seperti di atas + khusus: video `playsInline muted`, capture tidak reload
- [ ] Fallback unduh foto saat Web Share tak tersedia

**Print kartu QR**
- [ ] `/print/{eventId}/qr` A4 grid 2×4 rapi di Chrome & Safari
- [ ] QR terbaca kamera HP dari jarak ±1 m (ECC level M)

## 4. Performance & Accessibility — ⏳ PENDING

- [ ] Lighthouse mobile `/p/{eventId}/{tableId}` ≥ 85 performance (simpan JSON di folder ini)
- [ ] Lighthouse mobile `/` ≥ 85
- [ ] Bundle photobooth tanpa chunk AI (010–014 Phase 2 belum dibuat — otomatis aman)
- [ ] Keyboard nav dashboard (tab urut, focus ring dusty-blue terlihat)
- [ ] Screen reader spot check landing (heading hierarchy, alt text)
- [ ] Kontras token design-system §9 (text-primary vs bg-base ≥ 7:1)

## 5. Security QA — ⏳ sebagian by-design

Sudah tertanam & di-review kode:
- ✅ Upload tamu lewat API service role; client tak pernah pegang service key
- ✅ `client_upload_id` dedup (unique partial index + return existing row)
- ✅ Webhook Xendit verifikasi token constant-time + idempotent replay
- ✅ RLS: tamu tak bisa SELECT photos; policy anti-pattern `USING(true)` tidak dipakai
- ✅ Rate limit 12/menit/meja (+IP) di upload; 30/menit/IP di scan

Prosedur manual setelah env terisi:
```sql
-- cross-tenant: login sbg vendor B, coba akses event vendor A
select id from events where id = '<event-vendor-A>';      -- harus kosong
-- anon read photos harus kosong:
-- curl "$SUPABASE_URL/rest/v1/photos?select=*" -H "apikey: $ANON"
```
- [ ] Semua percobaan lintas vendor ditolak (404/kosong)
- [ ] Anon REST tidak bisa baca `photos` maupun objek bucket privat

## 6. Temuan bug selama implementasi (sudah difix)

| Severity | Temuan | Fix (commit) |
|---|---|---|
| Blocker | Slug route API bentrok `[id]` vs `[eventId]` → seluruh `/api/events/*` crash runtime | d3b798b→440d4c3 standarisasi `[eventId]` + validator Next |
| Blocker | RLS tanpa policy owner pada `tables` → generate meja gagal diam-diam | b6e2c7e migrasi 0010 `t_owner_all` |
| Critical | Cron TTL filter `deleted_at is false` salah sintaks PostgREST | 440d4c3 `.not(is,null)` |
| Major | Increment `scan_count` read-then-write lost update antar tamu bersamaan | d3b798b RPC atomik migrasi 0009 (+fallback) |
| Minor | Retry offline 5xx masuk antrean IndexedDB tanpa akhir saat server down | 440d4c3 kontrak send ok/drop/retry |

## 6b. Ronde verifikasi live — 2026-08-26 (env Supabase remote terisi)

Migrasi 0001–0011 di-apply ke project remote + seed. Temuan baru (sudah difix):

| Severity | Temuan | Fix |
|---|---|---|
| **Blocker** | Infinite recursion RLS (42P17) pada `p_guest_insert` — subquery kuota ke tabel photos di dalam policy photos itu sendiri; baru terlihat saat pertama kali di-apply (sebelumnya menunggu Docker) | migrasi 0012+0013: helper `private.can_guest_upload()` SECURITY DEFINER, policy jadi `WITH CHECK (private.can_guest_upload(event_id))` |
| **Critical** | Pola `.eq("deleted_at", null)` di **13 titik** (upload dedup, saved, galeri list, zip, detail event, halaman tamu) → error PostgREST `22007 invalid input syntax for timestamptz: "null"`; dedup retry offline & set `guest_saved_at` (north star) gagal | `.is("deleted_at", null)` massal; diverifikasi live: dedup `duplicate:true`, saved ok, galeri total=1 |
| Major | Webhook WA menerima POST tanpa verifikasi `x-hub-signature-256` (asimetris dgn Xendit) | `verifyMetaSignature()` HMAC constant-time, fail-closed (401 tanpa signature — terverifikasi) |
| Minor | Overview dashboard stat hardcoded "0" | Wired query nyata (event aktif / foto / momen disimpan) |

Hasil uji RLS live (task 002 AC): anon baca event aktif ✓ · anon tak bisa baca foto ✓ · insert aktif ✓ · nonaktif ✗ ✓ · expired ✗ ✓ · limit habis ✗ ✓ · Pro NULL unlimited ✓ · dedup unique ✓ · trigger `handle_new_vendor` ✓ · buckets+policy thumbs publik ✓.

## 6c. Ronde deploy prototipe Hostinger — 2026-08-26

| Severity | Temuan | Fix |
|---|---|---|
| **Blocker** | Next.js 16 build gagal di builder Hostinger shared (glibc < 2.29): Turbopack & load `next.config.ts` butuh binary SWC native → `Cannot find module <hash>.next.config` | build `--webpack` + config `next.config.mjs` (commit a5b01f5, d1548bd) |
| **Blocker** | Key storage menyertakan prefix nama bucket di dalam bucket → URL publik `thumbs`/`frames`/`showcase` double-prefix → 404 (thumb & frame tak tampil; foto privat selamat via signed URL) | koreksi konvensi final: key objek relatif bucket (tanpa folder bucket), kolom DB `{bucket}/{key}`; migrasi objek existing `scripts/migrate-storage-prefix.mjs` + SQL restore prefix kolom |
| **Major** | Ronde 1 koreksi: prefix bucket ikut dihapus dari kolom DB (`thumb_path`, `showcase.storage_path`) → `publicStorageUrl` menghasilkan URL tanpa bucket → 404 lagi (galeri broken image) | SQL restore prefix (`thumbs/`, `showcase/`) di kolom; writer kode memakai format `{bucket}/{key}` utk kolom DB & key relatif utk upload |

Checklist regresi storage (wajib setelah migrasi):
- [ ] Upload frame PNG → frame overlay tampil di `/p/[eventId]/[tableId]`; `frame_url` HTTP 200
- [ ] Upload foto → thumbnail tampil di grid dashboard tanpa klik; `thumb_url` HTTP 200
- [ ] Klik foto → lightbox (signed URL) tetap 200
- [ ] (bila ada data) Halaman `/moments` & rope landing menampilkan showcase 200
- [ ] Cron TTL & purge event/vendor masih menghapus objek benar (tanpa asumsi prefix)
- [ ] Capture foto rasio **3:4** (1080×1440) lintas device; frame 3:4 menutupi penuh (design-system §3.3)

Fitur baru 2026-08-26: `/admin/seo` (5 tab: SEO/GEO, Analytics, Marketing, Event Monitor, UTM) —
migrasi 0020–0021 (platform_settings + admin_secrets + event_logs + utm_visits +
subscriptions.utm_source). Verifikasi: robots.txt/sitemap.xml dinamis 200, meta/OG/twitter
dari settings, noindex `/p/*`, JSON-LD Organization/WebSite, GA4/GSC stats (butuh service account),
event wa_click/upgrade_click/payment_success, laporan UTM.

Smoke API end-to-end: signup(admin-create karena throttle email Supabase ~2/jam) → login → create event → generate meja → upload tamu → dedup → saved → galeri → signed URL 200 → QR SVG 200 → scan RPC → halaman `/p/...` 200 → delete event (purge storage). Advisors security/performance bersih (sisa INFO unused-index wajar).

Masih PENDING: E2E Playwright penuh, device lab, Lighthouse ≥85, isolasi lintas-vendor via 2 user, Xendit sandbox flow, kirim WA nyata (butuh token). Deploy prototipe Hostinger sudah live (task 015).

Tidak ada blocker/critical terbuka pada kode saat laporan ini dibuat.

## 7. Bug bash — ⏳ disarankan setelah env live

Sesi 1 jam sebelum onboarding vendor pertama: alur tamu di 1 meja nyata +
vendor dashboard, triase per severity §4.2 task 016, catat hasil di sini.

## 6c. Task 018 — Superadmin Dashboard (2026-08-26)

Fitur `/admin` (monitor + kelola tier + moderasi) dibangun & diverifikasi live:
guard 3 lapis teruji (anonim→login, vendor→dashboard, API tanpa sesi→404),
ganti tier free↔pro tersimpan + audit `[admin]` di Log Node app hPanel, nonaktif event
memutus upload tamu (404), hapus foto = soft delete. Bootstrap superadmin
pertama `calysta@temora.com` via Admin API + SQL `raw_app_meta_data`
(runbook §6). Tanpa perubahan skema public / policy RLS baru.

## 6d. Task 019 — Security Hardening + Admin v2 (2026-08-26)

Audit ronde 2 menemukan 8 temuan (1 injection PostgREST, MIME palsu ke bucket
publik, cookie non-httpOnly, tanpa origin check, dedup pra-ratelimit, ZIP
tanpa meter, rate-limit gap, billing tanpa filter eksplisit) — semuanya diperbaiki
& diverifikasi live. Ditambah manajemen vendor penuh (edit/ban dengan auto-
nonaktif event/hapus permanen bertingkat) + tabel `admin_audit_logs` (0014)
dan `vendors.banned_at` (0015). Pemisahan peran: superadmin diblokir dari
/dashboard. Unit test naik 26→38. Detail bukti per-AC di tasks/019 §5.

Sisa backlog keamanan (tidak blocker): limiter in-memory per-instance
(pindah Redis bila multi-region), MFA superadmin (rekomendasi runbook §7),
ZIP streaming untuk event sangat besar.

## 6e. Showcase Moments + Tali Momen (2026-08-26)

Galeri kurasi platform: superadmin input foto (`/admin/showcase`) → tampil di
halaman publik `/moments` dan rope interaktif di landing (port komponen
Chiffon, re-theme token penuh). Migrasi 0016 (tabel + bucket publik
`showcase`). Dependensi baru: motion v13. Verifikasi live: upload multi-file,
magic-byte (HTML menyamar → 415), soft-delete menyembunyikan konten publik,
purge objek storage, guard superadmin/origin/audit konsisten task 019.
Entri uji dibersihkan setelah verifikasi.

## 6g. Tali Momen — motion real + footer (2026-08-26)
Temuan user: rope terasa tanpa motion. Akar: jalur prefers-reduced-motion
mematikan inersia total (vel=0) — aktif bila OS Reduce Motion menyala.
Fix: meredam bukan mematikan (friksi 0.75, vel×0.2) + uji Playwright
objektif (drag → displacement & glide dinilai otomatis, dua konteks).
Footer dirapikan: ikon sosial ke kanan-bawah nav, link tak duplikat header,
halaman /faq baru.


## 7. Arsip Spesifikasi — Showcase Moments & Tali Momen (merged dari todo.md)

<!-- Konten asli todo.md dipindah ke sini agar dokumentasi terpusat di docs/. -->

# TODO — Showcase Moments & Tali Momen (Hanging Rope)

> Fitur galeri kurasi milik platform: superadmin input foto → tampil di
> halaman publik `/moments` dan sebagai rope interaktif di landing page.
> Sumber komponen rope: `hanging-rope-pack 2/` (ekstraksi situs Chiffon),
> di-port penuh ke tema token TEMORA. Referensi arsitektur: Chiffon
> (`chiffon-travel.vercel.app`) — rope landing ↔ halaman galeri berbagi
> satu sumber data.

## Keputusan Desain
1. **Konten = input eksklusif superadmin** (foto kurasi marketing) — bukan
   foto tamu vendor (privasi, keputusan terkunci #8).
2. Tabel baru `showcase_photos` + bucket publik `showcase` (migrasi 0016).
   RLS: anon/authenticated SELECT hanya baris aktif; tulis service role saja.
3. Rope di landing menarik **24 terbaru** dengan infinite loop (set diduplikat).
4. Klik kartu rope / grid → lightbox berisi foto besar + label + kutipan.
5. Re-theme penuh token terang TEMORA — buang tema gelap emas milik Chiffon;
   ikon phosphor → lucide; next-intl → copy Indonesia statis (§6); RTL dibuang.
6. Dependensi baru: `motion` (v12+). Nol hex baru — gradasi via color-mix token.

## Fase Kerja

### Fase A — Docs (commit bersama kode)
- [x] database.md: tabel `showcase_photos` + bucket `showcase`
- [x] architecture.md: routes `/moments`, `/admin/showcase`, API admin showcase
- [x] design-system.md §5: spesifikasi gerak "Tali Momen"
- [x] PRD.md: catatan enhancement

### Fase B — Backend
- [x] Migrasi 0016 (tabel + bucket + policy) applied ke remote
- [x] `npm install motion`

### Fase C — Admin (kurasi)
- [x] API: POST upload (multipart, magic-byte JPEG/PNG), PATCH (title/caption/sortOrder), DELETE (soft-delete + purge objek)
- [x] Halaman `/admin/showcase`: form upload multi-file + daftar kartu (edit caption, naik/turun urutan, hapus)
- [x] Nav "Moments" di AdminShell · guard superadmin + audit + origin check (pola task 019)

### Fase D — Publik
- [x] Halaman `/moments`: grid semua foto + lightbox klien
- [x] Komponen `RopeMoments.tsx`: drag pointer native + inersia rAF friksi 0.94 +
      wrap infinite loop + snap visual; klik kartu → overlay kutipan;
      reduced-motion = tanpa inersia; `<img>` lazy
- [x] Integrasi landing `/` antara cara-kerja dan CTA + link "Lihat semua momen"

### Fase E — Verifikasi & Ship
- [x] Pipeline lint/typecheck/test/build hijau
- [x] Smoke live: upload admin (3 foto) → muncul di /moments & rope landing → delete menghilang (soft-delete + purge objek storage terverifikasi)
- [x] Magic-byte: HTML menyamar .jpg ditolak 415; PNG asli diterima sebagai PNG
- [x] Anti-Slop Gate §11 manual ✓ · viewport 360px (kartu 210px + pan-y) ✓ · reduced-motion (inersia mati) ✓
- [x] AC dicentang berbasis bukti → commit push → folder pack dihapus

## Acceptance Criteria
- [x] Upload superadmin muncul di `/moments` dan rope landing < 1 refresh (live)
- [x] Rope bisa didrag dengan inersia & loop tak berujung (24 kartu × 2, wrap offset — port pack teruji di Chiffon)
- [x] Klik kartu membuka detail foto + label + kutipan (shared-element layoutId)
- [x] Soft-delete admin langsung menyembunyikan dari halaman publik (live: Uji-3 hilang, RLS `deleted_at is null`)
- [x] Vendor biasa tidak bisa akses `/admin/showcase`; anon tidak bisa menulis (guard superadmin + tanpa policy tulis)
- [x] Nol hex baru di komponen (semua via token & color-mix)

## Hasil Verifikasi (2026-08-26)
- Upload 3 foto sukses; entri uji dibersihkan setelah verifikasi (DB + objek storage).
- Catatan arsitektur: shuffle kartu memakai **hash deterministik** (bukan Math.random)
  agar murni — aman hydration & lolos aturan purity react-hooks. Urutan acak berubah
  setiap konten diperbarui, bukan tiap reload.
- Route API dipecah: `POST /api/admin/showcase`, `PATCH/DELETE .../[photoId]`,
  `POST .../reorder`.

## Non-Scope
- ❌ Foto tamu vendor sebagai konten publik (privasi #8)
- ❌ Rating bintang / nama tamu pada showcase (bukan testimoni asli)
- ❌ Drag-and-drop reorder (cukup tombol naik/turun)

## Ronde Perbaikan (2026-08-26, pasca-uji manual)
1. **Fix crash** `ShowcaseList`: draft edit kini fallback ke props — foto baru
   hasil refresh tak lagi memicu TypeError (akar "halaman broken" saat upload).
2. **Upload tangguh**: cap 10MB, validasi pra-fetch (ukuran/format/HEIC),
   pesan server spesifik.
3. **Placeholder**: kolom `external_url` (0017/0018 — storage_path jadi nullable
   + constraint salah-satu-sumber) + seed 12 foto campuran
   Unsplash/Wikimedia/picsum + fallback onError picsum seeded.
4. **Navbar/footer**: link Moments di header & footer.
5. **Sosial media dinamis**: tabel `platform_settings` (0019) +
   `/admin/settings` — ikon IG/TikTok/Facebook footer dirender hanya bila
   URL terisi (TikTok = SVG inline).
6. **Floating WhatsApp** di MarketingLayout (token success, semua halaman publik).

Catatan verifikasi: upload "grand luley" milik owner sebelumnya TERSIMPAN di DB —
yang gagal hanyalah render setelah refresh; kini aman.

## Ronde 3 (2026-08-26) — motion real + footer
1. **Fisika rope**: jalur reduced-motion tak lagi mematikan inersia total
   (akar "motion tidak ada" bila OS Reduce Motion aktif) — kini diredam
   (0.75/frame, vel×0.2 lepas) sesuai perilaku Chiffon.
2. **Ikon sosial** dipindah ke kolom navigasi footer (kanan, di bawah link).
3. **Footer links** tak lagi menduplikasi nav header → FAQ · Privasi · Syarat.
4. Halaman baru `/faq` (7 accordion native `<details>`, SEO metadata).
5. Uji objektif fisika rope: `tests/e2e/rope.spec.ts` (drag → track bergeser
   >150px; inersia meluncur; varian reducedMotion tetap berfungsi).

## Ronde 4 (2026-08-26) — polish footer & overlay
1. Nav footer kini **horizontal** (flex-wrap, rata kanan desktop) — sebelumnya
   kolom vertikal akibat refactor ikon sosial.
2. Foto di overlay momen (rope + lightbox /moments) memainkan efek
   **polaroid develop** (design-system §5) saat dipilih — konsisten dengan
   signature moment hero. Otomatis hormati prefers-reduced-motion.

## Ronde 5 (2026-08-26) — animasi kartu tali momen
1. **Develop stagger**: tiap foto kartu memainkan polaroid-develop saat masuk
   viewport, delay berjenjang (i%12)×0.05s+0.15s.
2. **Sway kontinu**: wrapper `animate-rope-sway` menggoyang kartu+caption
   ±1.4°/3.8s alternate, transform-origin top center, delay fase negatif per
   kartu (gelombang alami); klip & benang tetap di tali.
3. Hover: straighten+lift tetap; sway pause (`animation-play-state: paused`).
4. Reduced-motion: global rule globals.css mematikan keduanya otomatis;
   drag/inersia tetap fungsional.
5. e2e rope.spec wajib tetap pass (sway layer dalam, tak ganggu trackX).
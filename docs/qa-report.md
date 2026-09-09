# QA Report — TEMORA MVP

> **Catatan status terbaru (2026-09-09):** AR props/face landmark dihentikan
> dan implementasinya dihapus dari produk. Catatan ronde lama di bawah tetap
> dipertahankan sebagai histori QA; fitur yang masih tersedia adalah filter LUT.

### Kurasi LUT dan koreksi renderer (2026-09-09)

Katalog aktif dikurangi dari 43 menjadi 7 look (design-system §3.9); 36 aset
publik dihapus dan tetap dapat dipulihkan lewat Git. Kurasi berdasarkan
respons warna netral/warna kulit sintetis dan karakter look, belum merupakan
uji preferensi pada potret nyata. Parser lama memasukkan angka komentar
(misalnya copyright 2017) ke data dan salah menganggap ekspor Photoshop
berurutan RBG. Keduanya dikoreksi ke parsing per baris dan red-fastest.
Upload atlas memakai alignment 1 serta unit tekstur eksplisit; nilai di luar
gamut diklem. Intensitas per look dan slider terpisah diterapkan; capture
menunggu frame filter siap. Lint, typecheck saat build, build produksi dan
64 unit test lulus. Smoke test WebGL Chromium menguji tujuh aset secara
bergantian: output aktif berubah, intensitas nol identik dengan sumber
(toleransi 1 byte), dan Monokrom menghasilkan RGB netral. Uji kamera fisik
iOS/Android dan penilaian potret dalam beberapa pencahayaan masih pending.

### Verifikasi dependency lokal (2026-09-09)

Lockfile dilengkapi untuk dependency transitif `@emnapi` dan paket WASM
terkait, kemudian `npm ci --no-audit --no-fund` berhasil memasang ulang
dependency lokal. Instalasi sebelumnya tidak lengkap: ESLint kehilangan
`es-abstract/2024/AddEntriesFromIterable` dan binary `next` tidak tersedia.
Setelah perbaikan, lint, pemeriksaan TypeScript saat build, build produksi
(35/35 halaman statis), dan 60/60 unit test lulus pada Node 26.7.0 / npm
11.19.0. Ini verifikasi lokal; pipeline GitHub Actions (Node 20) belum
dijalankan ulang. Warning konfigurasi Vite dan lockfile di luar repo masih
muncul, tetapi tidak menggagalkan pemeriksaan.

> Task 016 · diperbarui 2026-08-29 · Gate launch: 0 blocker / 0 critical terbuka.
>
> **Status lingkungan:** key Supabase/Xendit/WhatsApp di `.env.local` awalnya
> sengaja diisi belakangan; sejak ronde verifikasi live (§6b) env Supabase
> terisi dan seluruh uji live berjalan. Yang masih **PENDING**: E2E Playwright
> penuh, device lab fisik (props/latar), Xendit sandbox, dan kirim WA nyata —
> semuanya menunggu jadwal eksekusi (task 016).

## Ringkasan gate (task 016 §4.1)

| Kategori | Gate | Status |
|---|---|---|
| Unit tests | Lulus di CI | ✅ 60/60 lulus lokal; coverage util inti 94.8% stmts (`npm run test:coverage`) |
| E2E jalur kritis 3/3 | Hijau 2× berturut-turut | ⏳ 3/4 hijau 2× (tamu, vendor, rope — §6h); billing menunggu task 008 |
| Device lab Android/iOS | Lolos tanpa blocker | ✅ alur inti terverifikasi manual owner (2026-08-28) — detail tasks/003–007 |
| Lighthouse ≥ 85 mobile photobooth | Terlampir | ✅ perf 99 / a11y 95 (docs/lighthouse/) |
| Cross-tenant RLS | Semua ditolak | ✅ manual 2 akun (2026-08-28) |
| Bug blocker/critical | 0 terbuka | ✅ (semua temuan sudah difix, lihat §6h) |

## 1. Unit tests (Vitest) — ✅

`tests/unit/` — 7 file, 60 test:
- `ulid` — format Crockford 26 char, monotonic, unik.
- `rate-limit` — sliding window izin/tolak/reset window.
- `validation` — event create/update (slug immutable, tanggal, pesan ramah),
  tables generate 1–50, `isUuid`, `themeAccent`, schema auth, `humanAuthError`,
  watermark text/posisi preset (2026-08-28: +12 test).
- `wa-xendit` — normalisasi E.164 (9 kasus), verifyCallbackToken constant-time
  termasuk env kosong.
- `security` — sanitasi query PostgREST, magic-byte JPEG/PNG, same-origin check,
  timing-safe compare (task 019; 2026-08-28: +PNG/image buffer).
- `lut` — parse `.cube` (ukuran/titik, tolak invalid), deteksi urutan channel
  **RBG** (header Adobe Photoshop) vs b-major, `buildHald` atlas + mapping
  indeks per order (2026-08-29, §6q).

Catatan: util kompresi canvas hidup di dalam `CameraStage.tsx` (tidak diekstrak)
— kebenarannya diliputi E2E guest flow (ukuran hasil ≤800KB diverifikasi server).

## 2. E2E (Playwright) — ⏳ spec siap

`tests/e2e/`: `guest.spec.ts` (consent → capture fake-camera → upload → toast →
Simpan ke HP), `vendor.spec.ts` (login → buat event → generate QR → galeri),
`billing.spec.ts` (checkout sandbox + webhook replay idempoten), `rope.spec.ts`
(fisika tali momen: drag → displacement + glide, dua konteks reduced-motion).
Semua gated oleh `E2E_ENABLED=1`.

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

> **Catatan 2026-08-28:** alur inti (kamera/capture/simpan di Android + iOS,
> scan QR → photobooth, cetak A4 1 m, responsive 360px, RLS lintas-vendor
> 2 akun, cron TTL) **terverifikasi manual oleh owner** — detail per-task di
> `tasks/003–007, 017`. Checklist granular di bawah tetap sebagai pengingat
> uji lanjutan (mode pesawat, orientasi landscape, dsb).

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
- ✅ HTTP security headers via `next.config.mjs` (2026-08-28): CSP `upgrade-insecure-requests; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (kamera tetap diizinkan), HSTS; `x-powered-by: Next.js` dihapus. Catatan: `server: hcdn`/`platform`/`panel` dari Hostinger CDN tidak bisa dihapus dari aplikasi (architecture.md §6).
- ⏳ Leaked-password protection Supabase (HaveIBeenPwned): **khusus Pro Plan ke atas** — organisasi masih Free (2026-08-28), tidak dapat diaktifkan. Pending sampai upgrade; **tidak dibahas lagi** di iterasi berikutnya. Temuan advisor lain (`rls_auto_enable` SECURITY DEFINER anon-executable, `admin_secrets` RLS tanpa policy = by-design) diabaikan sesuai keputusan owner.

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

## 6d. Task 018 — Superadmin Dashboard (2026-08-26)

Fitur `/admin` (monitor + kelola tier + moderasi) dibangun & diverifikasi live:
guard 3 lapis teruji (anonim→login, vendor→dashboard, API tanpa sesi→404),
ganti tier free↔pro tersimpan + audit `[admin]` di Log Node app hPanel, nonaktif event
memutus upload tamu (404), hapus foto = soft delete. Bootstrap superadmin
pertama `calysta@temora.com` via Admin API + SQL `raw_app_meta_data`
(runbook §6). Tanpa perubahan skema public / policy RLS baru.

## 6e. Task 019 — Security Hardening + Admin v2 (2026-08-26)

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

## 6f. Showcase Moments + Tali Momen (2026-08-26)

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

## 6h. Ronde E2E + Lighthouse — 2026-08-28

Eksekusi task 016 setelah env terisi penuh:

| Temuan | Severity | Fix |
|---|---|---|
| **PUT `/api/events/[eventId]` gagal 500** — input camelCase (`isActive`, `startsAt`, `endsAt`) di-update mentah ke PostgREST (kolom DB `is_active`/`starts_at`) → toggle aktif/nonaktif event & edit tanggal **rusak di produksi** | **Blocker** | Mapping camelCase→snake_case + filter `undefined` di route (hanya field yang dikirim) — diverifikasi live: PUT isActive 200 |
| **Capture fotobooth no-op diam-diam** — `capture()` bail bila `video.videoWidth === 0` (frame belum decode, umum di device lambat) → tombol terlihat aktif tapi tak bereaksi | **Major** | State `videoReady` (event `loadeddata`) → tombol "Ambil Momen" disabled sampai frame siap; guard tetap sebagai pengaman |
| Spec E2E vendor: `waitForURL("**/dashboard/events/**")` cocok dengan `/events/new` → eventId="new" → 404 | Test | Regex UUID eksplisit + deaktivasi event sisa run sebelumnya (free tier max 1 aktif) |

Hasil uji (semua live, dev server lokal → Supabase remote):
- **E2E Playwright**: tamu (capture→simpan→Simpan ke HP) · vendor (create→QR→galeri) · rope 2 skenario — **hijau 2× berturut-turut** (4/4, ±12 detik). Billing di-skip (task 008 ditunda).
- **Unit**: 46/46 · coverage util inti **94.8%** stmts / 95.2% lines (rate-limit 84%, security 96%).
- **Lighthouse mobile** (emulasi 375×812, throttling simulate): photobooth **perf 99/a11y 95** · landing **86/96** · pricing **99/96** · how-it-works **99/96** — JSON di `docs/lighthouse/`.
- Cross-tenant RLS 2 akun & alur manual: terverifikasi owner (tasks/003–007, 017).

## 6i. Ronde Fase 2/3 — tasks 010–014 (2026-08-28)

Keputusan terkunci #9 diperbarui: tabel fase 2 dibuat saat task dieksekusi.
Migrasi **0022** (moments + sponsors + bucket + RLS) applied ke remote.

| Task | Hasil |
|---|---|
| **010 AR Props** | MediaPipe FaceLandmarker lazy-load (chunk terpisah — page chunk tetap 25K, E2E guest 4.4s); 3 props SVG token (topi/kacamata/bunga); FPS watchdog auto-disable <20; props masuk hasil capture (mirror kamera depan); numFaces=4. Verifikasi FPS/group menunggu device lab |
| **011 Green Screen** | ImageSegmenter lazy-load; 3 latar bawaan token; preview live == hasil (canvas compositing dipakai capture); fallback graceful tanpa crash |
| **012 Moments** ⭐ | POST anon 201 + rate limit 429 (meja+IP) live; GET vendor / PATCH hide 200 live; anon tak baca (`[]`); composer tamu di fase saved; feed dashboard realtime (subscribe INSERT) + CSV export (hidden terkecuali). Batas teks final 280 char (task asli menulis 140 — dikoreksi) |
| **013 Sponsors** | Tier gate live: free → 403, pro → 201; logo upload magic-byte + URL publik 200; deactivate langsung hilang dari GET (tanpa cache); consent menyebut sponsor; strip logo di kartu QR print; purge objek saat delete |
| **014 Analytics** | Halaman 0.41–0.43s (3 hit, cache 60s); angka = SQL manual; response agregat tanpa data personal; bar per meja + heatmap jam 24 kolom (div/token, tanpa Chart.js — keputusan) |

E2E regression pasca-perubahan CameraStage: guest + vendor + rope **4/4 hijau** (2×).
Unit 50/50 · lint/typecheck/build hijau. Data uji (moments/sponsors) dibersihkan.

## 6j. Ronde PDF Export — 012 & 014 (2026-08-28)

Export PDF dikerjakan tanpa dependency baru — **print browser → PDF** (pola yang
sudah dipakai kartu QR, sesuai AC 014 yang memang menulis "print stylesheet"):

| Task | Implementasi |
|---|---|
| **012 PDF** | Halaman `/print/[eventId]/moments` (owner session, 307 anon): laporan A4 — header event + tanggal cetak + jumlah, daftar momen (maks 200) hanya yang **tidak tersembunyi**, label meja + timestamp, `break-inside: avoid`. Smoke: 200 + empty state rapi |
| **014 PDF** | Tombol "Cetak / Simpan PDF" di `/dashboard/events/[id]/analytics` + print CSS: shell/sidebar/header/EventSubNav disembunyikan (`print:hidden`), grid stat 4 kolom & seksi 1 kolom, tanpa padding — 1–2 halaman A4 |

Verifikasi: lint/typecheck/test 50/50/build hijau. Sisa AC yang menunggu device
lab (010 FPS/group, 011 lighting/edge) akan diuji manual owner lalu dilaporkan.

## 6k. Ronde bug momen + watermark kustom — 2026-08-28

| Severity | Temuan | Fix (commit) |
|---|---|---|
| Major | Momen yang di-hide vendor **hilang dari feed** dashboard — GET moments default filter `is_hidden=false`, padahal UI feed didesain menampilkan hidden (badge "Disembunyikan" + tombol unhide); sekali di-hide tak bisa ditampilkan lagi | `?hidden=all` di API + MomentsFeed fetch memakainya (737cf7c) |
| — | Watermark: posisi hardcode pojok kanan bawah; teks kustom Pro (`watermark_text`) ada di DB tapi tanpa jalur edit | Fitur lengkap: migrasi 0023 `watermark_position` (4 preset, CHECK), validation + gate Pro di API create/update (403 non-Pro), field teks+posisi di form event (disabled non-Pro), render 4 posisi di CameraStage |

Verifikasi watermark: lint/typecheck/test 53/53/build hijau; migrasi 0023
terpasang di remote (kolom + constraint). E2E manual (form Pro vs Free, hasil
foto 4 posisi) menyusul saat sandbox/akun Pro tersedia.

## 6l. Ronde filter, latar & prop AR — 2026-08-28

| Severity | Temuan | Fix |
|---|---|---|
| **Critical** | Green screen: `maskData[i]` salah indeks — `categoryMask.getAsUint8Array()` RGBA (kelas di byte pertama), jadi hanya 25% pixel person dapat alpha → potongan subjek berlubang (latar tembus "menutupi" orang) | `maskData[i * 4]` di `segmentation.ts` — subjek utuh di depan latar |
| **Major** | Prop AR melayang di preview kamera depan: overlay pakai koordinat video mentah, padahal video di-mirror CSS → preview ≠ hasil | `PropsOverlay` menerima `mirrored` + posisi di-flip |
| **Major** | Crop preview (object-cover centered) ≠ crop capture (top-bias) + prop digambar di koordinat video penuh → wajah/prop terpotong di foto tapi terlihat di preview | `src/lib/capture.ts`: `coverCrop` centered + `toCropSpace`; dipakai capture & overlay |
| **—** | Fitur baru: tab **Filter** (8 look 3D LUT film emulation, WebGL HALD — `ctx.filter` tak didukung Safari iOS) + **10 props AR** | `src/lib/ai/lut.ts` + `GradeCanvas`; aset `.cube` MIT (kredit `docs/research/lut-credits.md`) |

Verifikasi: lint/typecheck/**test 58/58**/build hijau; `parseCube`/`buildHald`
di-unit-test. Uji visual kamera asli (latar utuh, prop menempel, filter
WYSIWYG) manual owner di device lab — tercatat §7.

## 6m. Regresi live: latar, LUT, props — 2026-08-28

| Severity | Temuan (uji live) | Root cause | Fix |
|---|---|---|---|
| **Critical** | Latar masih "menutupi" orang (orang invisible) | `MPMask.getAsUint8Array()` **single-channel** 0–255 (bukan RGBA) — `maskData[i] === 1` (lama) maupun `maskData[i*4] === 1` (fix §6l) tak pernah true → alpha 0 semua. Dikonfirmasi dari source resmi `tasks/web/vision/core/mask.ts` (`floatArray.map(v => 255*v)`) | `mask.getAsFloat32Array()` (single-channel 0–1) → `> 0.5` |
| **Critical** | Filter LUT hasil gelap/hitam | Uniform `uSize`/`uGrid` tidak pernah di-`uniform1f` (default 0) → `color*(size-1)` negatif → clamp tak terdefinisi → semua texel sampling titik hitam | Set `uniform1f` di `setLut()` |
| **Major** | Props muncul ~sepersekian detik lalu hilang | Auto-disable menghitung **4 frame** (bukan 4 detik): window FPS 2 dtk belum penuh → `times.length/2 ≈ 0` → streak capai 4 dalam ~80ms; streak tak di-reset saat re-enable | Warm-up 2,5 dtk sebelum evaluasi FPS + disable berbasis durasi 4 dtk (`lowFpsSinceRef`) + reset saat start + `onAutoDisable` via ref (loop tak restart tiap re-render) |

Verifikasi: lint/typecheck/test 58/58/build hijau. Uji ulang visual live tetap
manual owner (latar → orang utuh di depan bg; LUT → warna film; props →
menempel stabil).

## 6n. Regresi live ronde 2 — 2026-08-28

| Severity | Temuan (uji live) | Root cause | Fix |
|---|---|---|---|
| **Critical** | Latar terbalik: wajah/badan customer yang diganti latar pilihan, lingkungan tetap video asli | `categoryMask.getAsFloat32Array()` pada build ini berperilaku seperti **confidence channel background** (nilai tinggi di area latar) → threshold `> 0.5` memberi alpha di latar, bukan person | `outputConfidenceMasks: true` + `confidenceMasks[0]` (background per model card) → **person = NOT background** (`1 - bgConf`), dengan **soft edge** ramp 0.3–0.7 |
| **Major** | Filter LUT berfungsi tapi gambar terbalik (kepala ke bawah) | `texImage2D` dari canvas DOM tanpa `UNPACK_FLIP_Y_WEBGL=true` → texture v=0 = baris atas gambar, quad menaruh v=0 di bawah viewport. Pola yang sama dipakai MediaPipe sendiri (`gpuOriginForWebTexturesIsBottomLeft`) | `gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)` sebelum upload source di `LutRenderer.render()` |
| **—** | Props AR: 6 aset diganti **Twemoji** (CC BY 4.0) agar look lebih "jadi"; 4 custom dipertahankan (topi, kelinci, kumis, halo) | — | `public/props/*.svg` + `props.ts` (`src`), kredit di `docs/research/lut-credits.md` |

Verifikasi: lint/typecheck/test 58/58/build hijau. Uji visual kamera asli manual
owner (latar utuh + soft edge, LUT tegak, props Twemoji menempel).

## 6o. Regresi live ronde 3 + keputusan feature flags — 2026-08-28

| Severity | Temuan | Root cause | Fix |
|---|---|---|---|
| **Critical** | LUT warna benar saat pertama dipakai, **rusak setelah ganti/aktifkan ulang filter** | `UNPACK_FLIP_Y_WEBGL` adalah **state global** konteks WebGL — di-set `true` di `render()` tiap frame tanpa reset; saat `setLut()` meng-upload ulang atlas HALD (toggle/switching LUT), atlas ikut ter-flip vertikal → sumbu hijau terbalik → warna kacau (dibuktikan simulasi CPU: input kulit `1,0.95,0.85` → `1,0.24,0.63`) | FLIP_Y di-**scope ketat**: `true` → upload source DOM → `false` segera; `setLut()` eksplisit `FLIP_Y=false` sebelum upload atlas |
| **Keputusan** | **Props AR & Green screen di-OFF sementara** — masih bermasalah di uji live; fokus ke LUT | — | `src/lib/ai/feature-flags.ts`: `ENABLE_PROPS=false`, `ENABLE_BACKGROUNDS=false` (UI disembunyikan, render di-guard; kode utuh). Fix terpasang di §6n/§6m (person=NOT bg + soft edge; FPS gate; Twemoji) — balik flag untuk uji ulang. Filter LUT tetap AKTIF |

Verifikasi: lint/typecheck/test 58/58/build hijau; simulasi lookup LUT (Node)
membuktikan mapping atlas benar dan atlas-flip menghasilkan warna menyimpang.

## 6p. Frame + LUT + manifest filter — 2026-08-29

| Severity | Temuan | Root cause | Fix |
|---|---|---|---|
| **Major** | Frame event **hilang di preview** saat filter LUT aktif (di foto hasil tetap ada) | GradeCanvas (kanvas opaque `inset-0`) dirender **setelah** overlay frame di DOM → menutupinya (z-order DOM). GreenScreenCanvas punya bug yang sama | Pindah GradeCanvas + GreenScreenCanvas ke **tepat setelah `<video>`**, sebelum blok overlay frame/watermark |
| **—** | Folder `./lut/` (root, 35 LUT RocketStock 32³) tidak ter-serve web; daftar filter hardcoded | — | Pindah 35 file → `public/luts/` (total 43); folder `./lut/` dihapus. **Manifest-driven**: `scripts/sync-luts.mjs` → `public/luts/manifest.json`; `getLuts()` dibaca runtime (fallback 8 kurasi bila gagal); `loadLut` pakai `encodeURIComponent` (nama ada spasi/.CUBE). Tambah filter = drop file + `node scripts/sync-luts.mjs` — tanpa ubah kode |

Keputusan owner: 35 LUT RocketStock **dikonfirmasi bebas lisensi** (dictatat di
lut-credits.md); kualitas penuh 32³ (~885 KB/filter, on-demand).

## 6q. Warna LUT RocketStock semua hijau — urutan channel file Adobe — 2026-08-29

| Severity | Temuan | Root cause | Fix |
|---|---|---|---|
| **Critical** | 35 LUT RocketStock render **dominan hijau** (8 LUT G'MIC tetap benar) | File plugin **Adobe Photoshop** memakai urutan indeks **R-outer → B-middle → G-inner** (`(r·S+b)·S+g`), parser menganggap b-major standar → channel tertukar (uji primari: hanya 1/43 lolos; dengan urutan Adobe: 30/35 lolos — 5 sisanya look ekstrem) | Deteksi otomatis header: `#Created by: Adobe Photoshop Export Color Lookup Plugin` → `order:"rbg"`; file G'MIC → `bgr`. `buildHald` memakai order saat menghitung indeks file; atlas/shader tidak berubah. Divirifikasi simulasi CPU: skin/primari masuk akal (Sepia hangat, Neon biru, Cinematic) |

Verifikasi: lint/typecheck/**test 60/60**/build hijau (+2 test order RBG).

## 7. Bug bash — ⏳ disarankan setelah env live

Sesi 1 jam sebelum onboarding vendor pertama: alur tamu di 1 meja nyata +
vendor dashboard, triase per severity §4.2 task 016, catat hasil di sini.

## 8. Arsip Spesifikasi — Showcase Moments & Tali Momen (merged dari todo.md)

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

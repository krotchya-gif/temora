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

Smoke API end-to-end: signup(admin-create karena throttle email Supabase ~2/jam) → login → create event → generate meja → upload tamu → dedup → saved → galeri → signed URL 200 → QR SVG 200 → scan RPC → halaman `/p/...` 200 → delete event (purge storage). Advisors security/performance bersih (sisa INFO unused-index wajar).

Masih PENDING: E2E Playwright penuh, device lab, Lighthouse ≥85, isolasi lintas-vendor via 2 user, Xendit sandbox flow, kirim WA nyata (butuh token), deploy preview Vercel.

Tidak ada blocker/critical terbuka pada kode saat laporan ini dibuat.

## 7. Bug bash — ⏳ disarankan setelah env live

Sesi 1 jam sebelum onboarding vendor pertama: alur tamu di 1 meja nyata +
vendor dashboard, triase per severity §4.2 task 016, catat hasil di sini.

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

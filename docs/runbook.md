# Runbook Operasional — TEMORA

> Prosedur cepat saat insiden. Pasangan dari architecture.md §9 (monitoring) dan checklist go-live task 015 §4.2.

## 1. Rollback deploy (Hostinger Git)

1. hPanel → **Website → temora.site → Git** → tab *Deploy/History*.
2. Temukan deployment terakhir yang sukses sebelum insiden.
3. **Deploy ulang commit sebelumnya** dari history, atau push commit revert
   (`git revert HEAD` → push `main`, Hostinger auto-deploy).
4. Verifikasi: buka `https://temora.site` + `/api/health` → 200.
5. Catat di channel insiden: waktu rollback, hash commit yang aktif.

> Rollback kode tidak mengembalikan database. Jika deploy bermasalah karena
> migrasi, lanjut ke §2 dulu sebelum memicu deploy ulang.
> Catatan: Hostinger shared menjalankan build lebih lambat (webpack+WASM).
> Saat launch (task 015), re-evaluasi Vercel/VPS (architecture.md §2).

## 2. Restore Supabase point-in-time (PITR)

1. Supabase Dashboard → project **production** → **Database → Backups**.
2. Pilih **Point-in-Time Recovery**, tentukan timestamp sebelum insiden (WIB).
3. Restore membuat branch/project restore baru — verifikasi dulu:
   - Row count tabel kunci: `vendors`, `events`, `photos`, `subscriptions`.
   - RLS spot check: query anon tidak boleh membaca `photos`.
4. Arahkan aplikasi ke project hasil restore (update `NEXT_PUBLIC_SUPABASE_URL` + keys di env Node app hPanel) atau dump & import delta ke production.
5. PITR tersedia di plan berbayar Supabase — pastikan aktif sebelum go-live (checklist 015).

## 3. Media storage Hostinger

1. Pastikan `media.temora.site` aktif dan document root-nya menunjuk ke folder service media.
2. Pastikan folder `public/` writable untuk `thumbs`, `frames`, `sponsors`, dan `showcase`.
3. Pastikan folder `private/` tidak dapat diakses langsung dari web (dijaga `private/.htaccess`); akses private hanya lewat `media-get.php` dengan secret.
4. Permission: file `0644`, folder `0755` (`upload.php` menulis begitu sejak patch 2026-09-10). Gejala klasik salah permission: thumbnail 404 padahal file ada di disk, folder terdeteksi ada (403), cache-buster tetap 404 — perbaiki dengan recurse File Manager/SSH (`find public private -type d -exec chmod 755 {} +` + `-type f -exec chmod 644 {} +`), detail `media-service/README.md`.
5. Pantau disk usage Hostinger. Bersihkan file expired/soft-deleted melalui cron aplikasi sebelum storage penuh.
6. Jangan menaruh `HOSTINGER_STORAGE_SECRET` di repo atau environment browser.
7. Data lama era Supabase tidak dimigrasikan (keputusan terkunci #20–21): 8 foto lama yatim — thumb 404 + `storage_path` tanpa prefix area ditolak `safeKey` (lightbox/ZIP gagal). Hidupkan via backfill (unzip Supabase → upload key baru → update kolom), bukan via fallback kode.

## 4. Insiden umum

| Gejala | Cek pertama | Aksi |
|---|---|---|
| Tamu "acara sudah selesai" padahal belum | `events.expires_at` | Perpanjang `expires_at` (SQL via CLI, bukan DDL) |
| Upload gagal massal | Log Node app hPanel + log PHP Hostinger | Cek URL/secret media, permission folder, ukuran file, dan magic bytes |
| Webhook Xendit tidak masuk | Xendit Dashboard → Webhooks log | Pastikan URL `https://temora.site/api/billing/webhook` & token per-env |
| WA tidak terkirim | `whatsapp_logs` (status/error) | Token Meta expired → refresh; quiet hours menahan sampai pagi |
| Cron tidak jalan | Riwayat job di cron-job.org / UptimeRobot | Header `Authorization: Bearer $CRON_SECRET` mismatch pemicu paling sering |
| Preview link WA/FB/X tanpa gambar | `NEXT_PUBLIC_APP_URL` di env hPanel | Wajib `https://…` (og:image http ditolak scraper); cek `/admin/seo` → OG Image URL |
| Angka GA4/GSC kosong di `/admin/seo` | Kredensial service account + property ID + site URL | Status jujur di tab Analytics; cek JSON valid & scope `readonly`; GSC Site URL harus identik dengan hasil `sites.list`; error tidak di-cache |

## 5. Checklist go-live (task 015 §4.2)

- [x] Acceptance criteria MVP (001–009 · 015–017)
- [ ] `/privacy` & `/terms` live dan terisi
- [ ] Custom SMTP email verifikasi Supabase terpasang & teruji
- [ ] Monitoring storage aktif (alert ≥ 80%)
- [ ] Migrasi production pushed (`supabase db push`) & diverifikasi
- [ ] Webhook Xendit produksi → `https://temora.site/api/billing/webhook`
- [ ] Template WA produksi terdaftar di Meta (task 009 §7)
- [ ] Cron TTL & expiry dipicu pinger eksternal (verifikasi hit manual dengan `CRON_SECRET` / log cron-job.org)
- [ ] Backup: PITR Supabase aktif

## 6. Superadmin (task 018)

Penanda role disimpan di `auth.users.app_metadata.role` — **hanya** boleh
diubah lewat SQL/Admin API (vendor tak bisa self-promote). Tanpa perubahan
skema `public`.

### Promosi superadmin

```sql
-- jalankan via Supabase CLI/SQL editor remote.
-- Catatan: kolom fisik bernama raw_app_meta_data ("app_metadata" hanya bentuk API).
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "superadmin"}'
where email = '<email>';
```

Setelah itu user wajib **login ulang** agar klaim JWT baru terbawa.
Verifikasi: buka `/admin` → shell admin muncul.

### SEO & analytics (halaman `/admin/seo`)

Semua pengaturan SEO/tracking/kampanye dikelola superadmin di `/admin/seo`
(5 tab — detail `docs/research/seo-admin-reference.md`):

1. **SEO & GEO**: meta title/description/keywords/OG image, isi `robots.txt` &
   `sitemap.xml` (kosong = fallback otomatis), blokir bot AI, koordinat GEO
   (JSON-LD LocalBusiness).
2. **Analytics**: masukkan ID GA4/GTM/Clarity/GSC. Untuk **angka real**:
   - Buat service account Google (IAM) dengan akses GA4 (`analytics.readonly`)
     & Search Console (`webmasters.readonly`), unduh JSON-nya.
   - Paste JSON di textarea → **Simpan Service Account** (tersimpan di
     `admin_secrets`, tidak pernah tampil lagi / keluar ke client).
   - Isi **GA4 Property ID** (angka) dan **GSC Site URL** yang sama persis
     dengan identifier properti di Search Console → Muat Statistik.
   - Produksi saat ini memakai URL-prefix `https://temora.site/`. Jangan memakai
     `sc-domain:temora.site` kecuali service account juga ditambahkan ke Domain
     Property terpisah tersebut. Perbedaan tipe properti menghasilkan 403 meski
     akun berstatus Owner pada properti URL-prefix.
3. **Marketing & Ads**: Meta Pixel / Google Ads / TikTok Pixel ID (di-inject
   otomatis ke semua halaman publik).
4. **Event Monitor**: event `wa_click`/`upgrade_click`/`payment_success` —
   tombol Retry bila status gagal.
5. **Campaign UTM**: builder link + laporan kunjungan & konversi per source.

> ⚠️ Produksi wajib `NEXT_PUBLIC_APP_URL=https://…` — meta `og:image` yang
> http ditolak scraper WA/FB/X (fallback di kode memaksa https, tapi env tetap
> harus benar untuk canonical/sitemap).

Status verifikasi analytics produksi (2026-09-10): website 200, GTM ditemukan
di HTML publik, GA4 Data API 200 dengan rows, dan GSC Search Analytics 200.
Respons GSC tanpa rows tetap sukses; artinya koneksi valid tetapi belum ada data
untuk rentang tanggal yang diminta.

### Pencabutan akses superadmin

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data - 'role'
where email = '<email>';
```

Lalu paksa logout sesi aktifnya (Dashboard → Auth → Users → sign out) dan
login ulang.

### Riwayat bootstrap

| Tanggal | Email | Catatan |
|---|---|---|
| 2026-08-26 | calysta@temora.com | Superadmin pertama (task 018) |

## 7. Rotasi password superadmin (task 019)

Superadmin wajib memakai password kuat (≥12 karakter campuran). Rotasi:

1. Dashboard Supabase → Authentication → Users → pilih akun → **Send password recovery** / atau via Admin API:
```bash
curl -X PUT "https://<ref>.supabase.co/auth/v1/admin/users/<USER_ID>" \
  -H "apikey: $SERVICE_ROLE" -H "Authorization: Bearer $SERVICE_ROLE" \
  -H "Content-Type: application/json" \
  -d '{"password": "<password-baru>"}'
```
2. Rekomendasi tambahan: aktifkan MFA TOTP (Auth → Providers → enable MFA; user daftar faktor kedua dari halaman akun).
3. Setelah rotasi, sesi lama tetap hidup — paksa sign-out semua sesi dari Dashboard bila rotasi karena kebocoran.

## 8. Ban & penghapusan vendor (task 019)

- **Ban** (via `/admin/vendors/[id]`): menolak login baru, memblokir sesi hidup, dan menonaktifkan seluruh event vendor. Unban hanya memulihkan login.
- **Hapus permanen**: purge media semua event → delete baris `vendors` (kaskade events/photos/subscriptions/wa_logs) → delete user auth. Data tidak dapat dipulihkan kecuali backup database dan backup Hostinger terpisah.

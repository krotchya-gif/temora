# Runbook Operasional — TEMORA

> Prosedur cepat saat insiden. Pasangan dari architecture.md §9 (monitoring) dan checklist go-live task 015 §4.2.

## 1. Rollback deploy Vercel

1. Buka Vercel Dashboard → project **temora** → tab **Deployments**.
2. Temukan deploy produksi terakhir yang **Ready** sebelum insiden.
3. Klik menu `⋯` → **Promote to Production** (rollback atomik, < 1 menit).
4. Verifikasi: buka `https://temora.id` + `/api/health` → 200.
5. Catat di channel insiden: waktu rollback, hash commit yang aktif.

> Rollback kode tidak mengembalikan database. Jika deploy bermasalah karena migrasi, lanjut ke §2 dulu sebelum promote.

## 2. Restore Supabase point-in-time (PITR)

1. Supabase Dashboard → project **production** → **Database → Backups**.
2. Pilih **Point-in-Time Recovery**, tentukan timestamp sebelum insiden (WIB).
3. Restore membuat branch/project restore baru — verifikasi dulu:
   - Row count tabel kunci: `vendors`, `events`, `photos`, `subscriptions`.
   - RLS spot check: query anon tidak boleh membaca `photos`.
4. Arahkan aplikasi ke project hasil restore (update `NEXT_PUBLIC_SUPABASE_URL` + keys di Vercel) atau dump & import delta ke production.
5. PITR tersedia di plan berbayar Supabase — pastikan aktif sebelum go-live (checklist 015).

## 3. Storage threshold ≥ 80% (~800 MB)

Ambang upgrade: free tier Supabase = 1 GB; **≥ 80% → langsung upgrade Supabase Pro $25/bln** (architecture.md §7).

1. Cek pemakaian: Supabase Dashboard → **Settings → Usage** → Storage.
2. Di atas ambang:
   - Upgrade plan (kartu di org settings). Tidak ada downtime.
   - Jalankan `GET /api/cron/photo-ttl` manual (`Authorization: Bearer $CRON_SECRET`) untuk memaksa pembersihan foto expired.
   - Cek event besar lewat dashboard vendor → hapus foto sampah / event uji.
3. Preventif: cron TTL harian (02.00 UTC+7? lihat vercel.json) harus aktif di Vercel Dashboard → Project → Cron Jobs.

## 4. Insiden umum

| Gejala | Cek pertama | Aksi |
|---|---|---|
| Tamu "acara sudah selesai" padahal belum | `events.expires_at` | Perpanjang `expires_at` (SQL via CLI, bukan DDL) |
| Upload gagal massal | Sentry + Vercel Logs route upload | Lihat error storage; cek kuota bucket & status Supabase |
| Webhook Xendit tidak masuk | Xendit Dashboard → Webhooks log | Pastikan URL `temora.id/api/billing/webhook` & token per-env |
| WA tidak terkirim | `whatsapp_logs` (status/error) | Token Meta expired → refresh; quiet hours menahan sampai pagi |
| Cron tidak jalan | Vercel Dashboard → Cron Jobs history | Header CRON_SECRET mismatch pemicu paling sering |

## 5. Checklist go-live (task 015 §4.2)

- [ ] Acceptance criteria MVP (001–009 · 015–017) ✅
- [ ] `/privacy` & `/terms` live dan terisi
- [ ] Custom SMTP email verifikasi Supabase terpasang & teruji
- [ ] Monitoring storage aktif (alert ≥ 80%)
- [ ] Migrasi production pushed (`supabase db push`) & diverifikasi
- [ ] Webhook Xendit produksi → `temora.id/api/billing/webhook`
- [ ] Template WA produksi terdaftar di Meta (task 009 §7)
- [ ] Sentry DSN aktif + test event masuk < 1 menit
- [ ] Cron TTL & expiry muncul di Vercel dashboard
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

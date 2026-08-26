# Pendoman Pemakaian Aplikasi TEMORA

> Panduan praktis menjalankan dan memakai aplikasi. Untuk keputusan desain, lihat `docs/` (SSOT) dan `README.md`.

---

## 1. Role Pengguna (4 role)

| Role | Siapa | Akses | Cara Masuk |
|---|---|---|---|
| **Vendor** | WO, fotografer, EO — pelanggan SaaS | Dashboard penuh: event, QR, galeri, ZIP, billing, pengaturan | Daftar/masuk di `/signup` · `/login` |
| **Tamu** | Undangan acara | Halaman photobooth saja (`/p/[eventId]/[tableId]`) | Scan kartu QR di meja — **tanpa akun, anonim** |
| **Superadmin** | Pemilik platform TEMORA | `/admin`: pantau semua vendor/event, kelola tier, moderasi event & foto | Akun biasa yang dipromosikan via SQL (lihat bawah) |
| **Admin Platform (kontak)** | Nomor WA tujuan aktivasi vendor | Bukan role aplikasi — hanya kontak manusia | `NEXT_PUBLIC_WA_ADMIN_NUMBER` |

### Menjadikan superadmin (bootstrap)

1. Daftar dulu seperti biasa di `/signup`.
2. Promosikan lewat SQL (sekali saja — detail lengkap di `docs/runbook.md §6`):
   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"superadmin"}'
   where email = '<email>';
   ```
3. Login ulang → buka `/admin`.

Tidak ada pendaftaran superadmin publik — dengan sengaja, demi keamanan.

**Prinsip peran terpisah (task 019): 1 akun = 1 peran.** Superadmin adalah
operator platform murni — dia tidak bisa membuka dashboard vendor, dan vendor
tidak melihat jejak admin sedikit pun. Kalau pemilik TEMORA ingin ikut jualan
sebagai vendor, buat akun terpisah.

### Manajemen vendor oleh superadmin

Di `/admin/vendors/[id]` superadmin bisa: edit profil vendor, ban/unban
(ban menonaktifkan otomatis semua event vendor dan memblokir login), ganti
paket, serta **hapus permanen** (purge storage + cascade data + hapus auth
user — konfirmasi ketik email, tidak bisa dibatalkan). Semua aksi tercatat di
`/admin/audit`.

---

## 2. Menjalankan Aplikasi (Lokal)

### Prasyarat
- Node.js ≥ 20 (`.nvmrc`)
- Project Supabase aktif + CLI linked (`supabase/.temp/project-ref`)
- `.env.local` terisi (salin dari `.env.example`; minimal trio Supabase + `NEXT_PUBLIC_APP_URL`)

### Langkah

```bash
npm install                 # dependensi
supabase db push            # apply migrasi (atau sudah applied via remote)
psql "$DATABASE_URL" -f supabase/seed.sql   # opsional: data dev (1 vendor + 1 event + 2 meja)
npm run dev                 # http://localhost:3000
```

Verifikasi cepat: buka `http://localhost:3000/api/health` → `{"ok":true,"supabase":"configured"}`.

### Data dev (seed)
| Data | Nilai |
|---|---|
| Event | "Pernikahan Dev" — slug `pernikahan-dev`, aktif, limit 100 foto |
| Meja | Meja 1, Meja 2 |

URL photobooth seed: `http://localhost:3000/p/00000000-0000-4000-8000-0000000000e1/00000000-0000-4000-8000-000000000101`

> ⚠️ Catatan signup lokal: SMTP bawaan Supabase dibatasi ±2 email/jam. Untuk uji cepat, matikan konfirmasi email (Dashboard → Auth → Providers) atau pasang custom SMTP.

---

## 3. Flow Vendor (pemilik acara)

```
Daftar → Buat Event → Upload Frame → Generate QR → Cetak → Hari-H → Galeri & ZIP
```

1. **Daftar/Masuk** — `/signup` (nama, email, kata sandi ≥8). Konfirmasi email bila aktif. Tier awal **Free**: 1 event aktif, 100 foto/event.
2. **Buat Event** — `/dashboard/events/new`: nama, slug kustom (immutable), tema, lokasi, tanggal, jumlah foto (ikut tier; Pro = unlimited).
3. **Upload Frame** — PNG transparan (480–2560px) di halaman edit event. Frame otomatis jadi overlay hasil foto tamu + watermark "Keep it close. Keep it TEMORA." (Pro bisa kustom teks watermark).
4. **Generate QR Meja** — tab QR → pilih jumlah meja (maks 50) → tiap meja dapat QR unik yang mengarah ke `/p/[eventId]/[tableId]`.
5. **Cetak Kartu** — `/print/[eventId]/qr` → lembar A4 grid 2×4 siap potong → taruh di meja tamu.
6. **Aktifkan Event** — toggle status. Tamu hanya bisa akses event **aktif & belum expired** (TTL default 30 hari).
7. **Hari-H** — pantau galeri real-time `/dashboard/events/[eventId]/gallery` (foto masuk tanpa refresh, ada lightbox & hapus).
8. **Unduh Hasil** — tombol ZIP di galeri: ≤100 foto langsung; >100 foto berjalan background dengan progress bar.
9. **Selesai Acara** — nonaktifkan event (membebaskan slot event aktif Free tier).

**Batasan tier** (terkunci, dicek server-side): Free 1 aktif/100 foto · Basic Rp99K 3 aktif/500 foto · Pro Rp299K unlimited.

---

## 4. Flow Tamu (di lokasi acara)

```
Scan QR → Consent → Kamera → Ambil Foto → Simpan/Bagikan
```

1. Scan kartu QR di meja → browser HP buka halaman photobooth (tanpa install apa pun).
2. Layar persetujuan privasi → "Oke, Mengerti".
3. Izin kamera → ambil selfie/foto bersama; frame acara & watermark terpasang otomatis.
4. Foto dikompres <800KB lalu tersimpan ke galeri vendor (jaringan lemah? foto masuk antrean offline dan terkirim otomatis saat online — tidak hilang).
5. Preview instan → **Simpan ke HP** atau **Bagikan** (Web Share API ke WA/IG).
6. Selesai — tamu tidak meninggalkan data pribadi apa pun.

Anti-spam: maks 12 foto/menit per meja; link kadaluarsa/event nonaktif menampilkan layar ramah.

---

## 5. Flow Admin Platform (MVP)

1. **Aktivasi & onboarding vendor** — calon vendor menghubungi via tombol WA di landing/pricing (`wa.me/<NEXT_PUBLIC_WA_ADMIN_NUMBER>`).
2. **Upgrade paket** — vendor bayar sendiri via `/dashboard/billing` (Xendit); admin hanya menangani kasus khusus. Webhook Xendit otomatis menaikkan tier.
3. **Perpanjangan** — manual: sistem antre reminder WA H-3 dan H-0 (cron `wa-reminders`), worker kirim tiap 5 menit (`wa-queue`, quiet hours 22:00–07:00 WIB).
4. **Monitoring** — Sentry (error), UptimeRobot (ping `/api/health`); analitik web nonaktif sementara di prototipe (Vercel Analytics no-op di luar Vercel — architecture.md §9).

---

## 6. Operasional Otomatis (Cron — Pinger Eksternal)

| Job | Jadwal | Fungsi |
|---|---|---|
| `/api/cron/photo-ttl` | 02:00 harian | Hapus foto event expired + hard-delete soft-delete >30 hari |
| `/api/cron/subscription-expiry` | 03:00 harian | Turunkan tier vendor yang periode pembayarannya habis |
| `/api/cron/wa-queue` | tiap 5 menit | Kirim pesan WA dari antrean (maks 25/kali) |
| `/api/cron/wa-reminders` | 08:00 harian | Antre reminder renewal H-3/H-0 |

Semua route cron diproteksi `Authorization: Bearer CRON_SECRET`.

> Hostinger shared (prototipe) tidak punya scheduler HTTP bawaan — keempat job
> dipicu **pinger eksternal gratis** (cron-job.org / UptimeRobot) sesuai jadwal
> di atas, dengan header `Authorization: Bearer $CRON_SECRET`. Saat launch
> (task 015), pindah ke scheduler native (Vercel Cron / systemd timer).

---

## 7. Pengujian

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm test              # vitest unit (38 test)
npm run build         # production build
npm run test:e2e      # Playwright — butuh E2E_ENABLED=1 + env (lihat .env.example)
```

E2E memakai data seed: set `E2E_EVENT_ID` & `E2E_TABLE_ID` dari UUID seed di atas.

---

## 8. Masalah Umum

| Gejala | Penyebab & Solusi |
|---|---|
| Signup "Terlalu banyak percobaan" | Throttle SMTP Supabase (±2 email/jam). Tunggu, matikan konfirmasi email, atau pasang custom SMTP |
| Email ditolak `email_address_invalid` | Supabase menolak domain reserved (mis. `.test`) — pakai domain valid |
| Kamera tak muncul di halaman tamu | Butuh HTTPS (atau localhost) untuk `getUserMedia`; cek izin browser |
| Upload gagal saat sinyal jelek | Biarkan — foto masuk antrean IndexedDB, terkirim ulang otomatis saat online |
| ZIP >100 foto lambat | Normal — job background; tutup tab aman, progres lanjut saat dibuka lagi |

---

*Dibuat 2026-08-26 · sesuai implementasi MVP (task 001–009, 015–017).*

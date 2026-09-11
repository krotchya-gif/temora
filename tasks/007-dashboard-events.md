# Task 007 — Dashboard Vendor (CRUD Events)

*Status: Selesai (2026-08-28) — seluruh AC terverifikasi manual (owner, termasuk RLS 2 akun) · Prioritas: High · Phase: MVP*

Depends on: 003, 002

---

## 1. Tujuan

Vendor mengelola events: buat, edit, aktifkan/nonaktifkan, hapus — termasuk upload frame kustom.

## 2. Scope

- `/dashboard/events`: list semua event milik vendor (card per event: nama, tema, tanggal, jumlah foto, status).
- `/dashboard/events/new`: form tahap pertama untuk membuat event (nama, tema/kategori,
  tanggal mulai/selesai, lokasi, link kustom).
- `/dashboard/events/[eventId]`: detail + workspace setup setelah event diklik.
- `/dashboard/events/[eventId]/edit`: setup tampilan event (cover/frame, kamera,
  filter, watermark) dan edit detail event.
- `/dashboard/events/[eventId]/cover`: editor visual cover tamu (template, foto,
  judul, subjudul, tombol).
- Edit event + ganti frame.
- Toggle aktif/nonaktif (menutup akses tamu via RLS policy yang sudah ada).
- Delete event (soft confirm modal; cascade hapus foto storage via job).
- Validasi tier saat create/activate: free = max 1 event **aktif** (unlimited nonaktif); basic = max 3 aktif; pro = unlimited aktif. Cek server-side, bukan cuma UI.
- Saat create event: set `photo_limit` dari tier vendor saat itu (Free=100, Basic=500, Pro=NULL). Tidak diupdate saat upgrade tier nanti — lihat database.md §2.7.
- Block activate/create event baru jika downgrade ke Free dengan >1 event aktif (event aktif existing tetap jalan).
- Upload frame: validasi PNG transparan (mime + dimensi min/max), compress bila perlu. Key objek relatif bucket = `{vendor}/{event}/frame.png`; `frame_url` (DB) berformat `frames/{vendor}/{event}/frame.png` (database.md §6). Frame wajib **3:4** (rekomendasi 1080×1440, design-system §3.3).
- Field opsional "Link kustom": slug publik untuk URL photobooth alternatif (`/p/{slug}/{tableId}`). Validasi zod format `^[a-z0-9-]{6,60}$` + unik; kosong → auto-generate dari nama (+ suffix pendek bila bentrok); immutable setelah dibuat.

## 3. Non-Scope

- ❌ Billing/upgrade flow (task 008).
- ❌ Notifikasi WA "event created" (task 009 — tapi siapkan hook call point-nya).

## 4. Desain

### 4.1 EventCard
Sesuai design-system §3.5: tema sebagai small-caps dusty-blue, nama font-display, meta info secondary, actions row.

### 4.2 Form UX
Alur dua tahap: simpan detail dasar dulu, lalu redirect ke detail event. Dari
detail event vendor masuk ke workspace setup tampilan: frame/cover, preview
kamera, filter warna, watermark, dan kartu QR. Semua tetap mobile-friendly.

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `src/app/dashboard/events/page.tsx` | baru |
| `src/app/dashboard/events/new/page.tsx` | baru |
| `src/app/dashboard/events/[eventId]/page.tsx` | baru |
| `src/app/dashboard/events/[eventId]/edit/page.tsx` | baru |
| `src/app/api/events/route.ts` | baru (GET list, POST create) |
| `src/app/api/events/[id]/route.ts` | baru (GET/PUT/DELETE) |
| `src/app/api/events/[id]/frame/route.ts` | baru (upload frame) |
| `src/lib/validation/event.ts` | zod schemas |

## 6. Acceptance Criteria

- [x] CRUD lengkap berfungsi end-to-end dengan data dummy seed.
- [x] Free tier diblokir bikin event aktif kedua (pesan ramah + CTA upgrade).
- [x] Frame PNG transparan tampil sempurna overlay di halaman photobooth.
- [x] Event nonaktif → halaman tamu menampilkan "acara sudah berakhir".
- [x] Semua form tervalidasi (zod) dengan pesan error human.
- [x] RLS: vendor B tidak bisa akses API event milik vendor A (test manual 2 akun).
- [x] Custom slug bisa dipakai membuka photobooth; slug bentrok ditolak dengan pesan ramah.
- [x] Block activate/create event baru jika downgrade ke Free dengan >1 event aktif (event aktif existing tetap jalan).

> Terverifikasi manual oleh owner (2026-08-28): seluruh AC di atas lulus uji nyata (CRUD, frame, slug, RLS 2 akun).

## 7. Catatan

Slug auto-generate dari nama (+ suffix pendek jika bentrok), atau diisi vendor via field "Link kustom"; immutable setelah dibuat. Route tamu menerima UUID maupun slug di `[eventId]` — QR tetap encode UUID (keputusan task 005).

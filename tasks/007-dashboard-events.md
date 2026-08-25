# Task 007 — Dashboard Vendor (CRUD Events)

*Status: Ready · Prioritas: High · Phase: MVP*

Depends on: 003, 002

---

## 1. Tujuan

Vendor mengelola events: buat, edit, aktifkan/nonaktifkan, hapus — termasuk upload frame kustom.

## 2. Scope

- `/dashboard/events`: list semua event milik vendor (card per event: nama, tema, tanggal, jumlah foto, status).
- `/dashboard/events/new`: form buat event (nama, tema, tanggal mulai/selesai, lokasi, upload frame PNG).
- `/dashboard/events/[eventId]`: detail + tab ringkas (galeri, QR, frame, pengaturan).
- Edit event + ganti frame.
- Toggle aktif/nonaktif (menutup akses tamu via RLS policy yang sudah ada).
- Delete event (soft confirm modal; cascade hapus foto storage via job).
- Validasi tier saat create/activate: free = max 1 event **aktif** (unlimited nonaktif); basic = max 3 aktif; pro = unlimited aktif. Cek server-side, bukan cuma UI.
- Saat create event: set `photo_limit` dari tier vendor saat itu (Free=100, Basic=500, Pro=NULL). Tidak diupdate saat upgrade tier nanti — lihat database.md §2.7.
- Block activate/create event baru jika downgrade ke Free dengan >1 event aktif (event aktif existing tetap jalan).
- Upload frame: validasi PNG transparan (mime + dimensi min/max), compress bila perlu, simpan ke `frames/{vendor}/{event}/frame.png`.
- Field opsional "Link kustom": slug publik untuk URL photobooth alternatif (`/p/{slug}/{tableId}`). Validasi zod format `^[a-z0-9-]{6,60}$` + unik; kosong → auto-generate dari nama (+ suffix pendek bila bentrok); immutable setelah dibuat.

## 3. Non-Scope

- ❌ Billing/upgrade flow (task 008).
- ❌ Notifikasi WA "event created" (task 009 — tapi siapkan hook call point-nya).

## 4. Desain

### 4.1 EventCard
Sesuai design-system §3.5: tema sebagai small-caps dusty-blue, nama font-display, meta info secondary, actions row.

### 4.2 Form UX
Satu kolom, mobile-friendly. Frame upload dengan preview instan (drag-drop atau tap). Simpan → toast sukses → redirect detail event.

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

- [ ] CRUD lengkap berfungsi end-to-end dengan data dummy seed.
- [ ] Free tier diblokir bikin event aktif kedua (pesan ramah + CTA upgrade).
- [ ] Frame PNG transparan tampil sempurna overlay di halaman photobooth.
- [ ] Event nonaktif → halaman tamu menampilkan "acara sudah berakhir".
- [ ] Semua form tervalidasi (zod) dengan pesan error human.
- [ ] RLS: vendor B tidak bisa akses API event milik vendor A (test manual).
- [ ] Custom slug bisa dipakai membuka photobooth; slug bentrok ditolak dengan pesan ramah.
- [ ] Block activate/create event baru jika downgrade ke Free dengan >1 event aktif (event aktif existing tetap jalan).

## 7. Catatan

Slug auto-generate dari nama (+ suffix pendek jika bentrok), atau diisi vendor via field "Link kustom"; immutable setelah dibuat. Route tamu menerima UUID maupun slug di `[eventId]` — QR tetap encode UUID (keputusan task 005).

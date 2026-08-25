# Task 005 — QR Code Kartu Meja

*Status: Ready · Prioritas: High · Phase: MVP*

Depends on: 002

---

## 1. Tujuan

Vendor generate QR code unik per meja → cetak kartu meja siap pasang di venue. Ini pintu masuk tamu ke photobooth.

## 2. Scope

- API generate N tabel sekaligus (`POST /api/events/[id]/tables`, body `{ count }`) → insert rows + simpan label otomatis ("Meja 1"…).
- Endpoint QR image: `/api/events/[id]/qr/[tableId]` → SVG (qrcode lib), encode URL `/p/{eventId}/{tableId}` (UUID kanonik).
- Halaman dashboard `/dashboard/events/[eventId]/qr`: grid preview semua QR + input jumlah tabel + regenerate individual.
- Halaman print `/print/[eventId]/qr` (public via owner session): layout A4, grid 2×4 per halaman, tiap kartu berisi QR besar + nama event + nomor meja + tagline TEMORA kecil.
- CSS `@media print` — tombol screen-only disembunyikan saat cetak.

## 3. Non-Scope

- ❌ Custom branding kartu per vendor (backlog).
- ❌ Dynamic QR yang bisa re-target (pakai URL stabil biar QR tak perlu diganti).

## 4. Desain

### 4.1 Kartu Meja (print layout)

```
┌────────────────────┐
│   [QR CODE]        │  ← min 4×4 cm agar mudah discam
│   Pernikahan       │
│   Andi & Sinta     │
│   Meja 5           │
│  Keep the moments  │
│      close.        │
└────────────────────┘
```

### 4.2 Error correction
QR pakai error correction level `M` (≈15% recovery) — tahan sedikit kotor/lipat.

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `src/app/api/events/[id]/tables/route.ts` | baru |
| `src/app/api/events/[id]/qr/[tableId]/route.tsx` | baru — SVG response |
| `src/app/dashboard/events/[eventId]/qr/page.tsx` | baru |
| `src/app/print/[eventId]/qr/page.tsx` | baru |

## 6. Acceptance Criteria

- [ ] Generate 20 tabel sekali klik; row muncul di DB dengan label benar.
- [ ] Scan QR dari HP → langsung buka halaman photobooth event tsb.
- [ ] Print preview A4 rapi; hasil cetak terbaca dari jarak 1 meter.
- [ ] Regenerate satu tabel tidak mengubah tabel lain.
- [ ] Halaman print tidak bisa diakses non-owner.

## 7. Catatan

QR meng-encode UUID sebagai bentuk kanonik tunggal (`/p/{eventId}/{tableId}`) — stabil lintas environment, tidak ambigu, satu konvensi cetak. Slug kustom vendor tetap valid sebagai alias (server menerima keduanya — lihat task 007), tapi tidak dipakai di QR.

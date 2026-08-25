# Task 013 — Sponsorship Slots

*Status: Ready · Prioritas: Low · Phase: 3*

Depends on: 006, 007, 008

---

## 1. Tujuan

Vendor bisa menjual slot sponsorship pada aset event (frame foto, kartu QR) — revenue stream tambahan di luar subscription dan pemanis pitch ke corporate client.

## 2. Scope

- Migrasi tabel:
  ```sql
  CREATE TABLE sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    logo_url TEXT NOT NULL,          -- PNG transparan di bucket frames
    website TEXT,
    slot TEXT NOT NULL CHECK (slot IN ('frame','qr_card')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
  RLS: vendor full akses miliknya; anon baca sponsor event aktif (untuk render frame/QR).
- Dashboard tab "Sponsors" per event: tambah/hapus sponsor, upload logo (validasi PNG transparan + max dimensi), pilih slot.
- Compositing otomatis:
  - Slot `frame` → logo pojok kanan bawah hasil foto (opacity 90%, lebar ≤ 18% canvas), digambar setelah watermark.
  - Slot `qr_card` → strip footer kartu meja print ("Didukung oleh {logo}").
- Gating tier: hanya **Pro** (server-side check).
- Consent screen tamu wajib menyebut kehadiran sponsor saat fitur aktif.

## 3. Non-Scope

- ❌ Slideshow slot (fitur Live Photo Wall belum ada).
- ❌ Revenue cut / payout engine TEMORA (vendor deal langsung dengan sponsornya).
- ❌ Klik-tracking link sponsor.

## 4. Desain

### 4.1 Aturan compositing
| Aturan | Nilai |
|---|---|
| Posisi | Pojok kanan bawah, margin 4% sisi |
| Ukuran | Max 18% lebar canvas, aspect ratio terjaga |
| Urutan gambar | Video → bg → props → frame → watermark → sponsor |
| Foto lama | Tidak di-reprocess — hanya foto baru |

### 4.2 Batas jumlah
Max 2 sponsor aktif per event (1 per slot) — jaga estetika; lebih dari itu merusak kesan premium brand.

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `supabase/migrations/0011_sponsors.sql` | baru — tabel + RLS |
| `src/app/dashboard/events/[eventId]/sponsors/page.tsx` | baru |
| `src/app/api/events/[id]/sponsors/route.ts` | baru — CRUD + upload logo |
| `src/lib/canvas/composite.ts` | refactor — urutan layer + layer sponsor |
| `src/app/print/[eventId]/qr/page.tsx` | strip footer sponsor |
| `src/components/photobooth/ConsentScreen.tsx` | baris disclosure sponsor |

## 6. Acceptance Criteria

- [ ] Vendor Pro bisa attach logo ke frame & QR card; Free/Basic tidak melihat fitur (API menolak 403).
- [ ] Logo tampil konsisten di semua foto baru tanpa re-process foto lama.
- [ ] Hapus/deactivate sponsor membersihkan dari capture berikutnya (< 30 detik propagasi).
- [ ] Consent screen menyebut sponsor saat fitur aktif; tidak menyebut saat tidak ada.
- [ ] Kartu QR print memuat strip sponsor rapi di A4.

## 7. Catatan

Model bisnis MVP: vendor set harga sendiri ke sponsornya; TEMORA tidak ikut cut — fitur ini nilai-jual tier Pro. Evaluasi monetisasi cut setelah ada data adopsi. Jaga disiplin: sponsorship yang berlebihan akan membunuh positioning premium.

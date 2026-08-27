# Task 012 — Fitur Moments (Guestbook Digital)

*Status: Selesai (2026-08-28) — kode + verifikasi live + export CSV & PDF (print browser, hidden terkecuali) · Prioritas: High · Phase: 2 ⭐*

Depends on: 004, 006

---

## 1. Tujuan

Mewujudkan inti brand TEMORA ("moments over photos") sekaligus **differentiator utama vs kompetitor** (lihat `docs/research/competitor-analysis.md`): tamu menambahkan caption/pesan pendek pada fotonya, vendor mendapat guestbook digital per event.

## 2. Scope

- Migrasi tabel baru:
  ```sql
  CREATE TABLE moments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    photo_id UUID REFERENCES photos(id) ON DELETE SET NULL, -- nullable: pesan tanpa foto boleh
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    author_name TEXT,                                       -- opsional, tanpa email
    message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 140),
    hidden_at TIMESTAMPTZ,                                  -- moderasi soft (hide, bukan hapus)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX idx_moments_event_time ON moments(event_id, created_at DESC);
  ```
- RLS:
  - Anon INSERT ke event aktif saja; anon tidak bisa SELECT momen orang lain.
  - Vendor full akses momen event miliknya.
- Photobooth page: setelah simpan foto → layar opsional *"Apa yang sedang kamu rasakan?"* (skip-able, max 140 char, nama opsional).
- Dashboard tab "Moments": feed kronologis real-time (Supabase Realtime, pola sama dengan galeri) + foto terkait.
- Export guestbook: CSV (pesan + waktu + meja) dan PDF print-friendly.
- Moderasi: vendor hide/show pesan; hidden tidak tampil di feed publik & export.
- Rate limit anti-spam server-side: 1 moment / 60 detik / per table.

## 3. Non-Scope

- ❌ Like/reaksi antar tamu (tamu tak bisa lihat momen orang lain — privasi tetap).
- ❌ Moderasi otomatis AI (manual vendor dulu).
- ❌ Notifikasi WA per moment masuk (spam risk).

## 4. Desain

### 4.1 Alur UX tamu
```
Foto tersimpan ✨ → layar caption ("Apa yang sedang kamu rasakan?")
  → ketik (opsional) → Kirim → "Momenmu udah aman 🤍" → kembali ke kamera
```
Copy hangat sesuai design-system §6 — bukan "Add caption".

### 4.2 Empty state
*"Belum ada cerita yang ditulis. Momen pertama biasanya paling jujur."*

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `supabase/migrations/0010_moments.sql` | baru — tabel + RLS |
| `src/components/photobooth/MomentPrompt.tsx` | baru |
| `src/app/api/events/[id]/moments/route.ts` | baru — POST (tamu, rate-limited) |
| `src/app/api/events/[id]/moments/[momentId]/route.ts` | baru — PATCH hide/show (vendor) |
| `src/app/api/events/[id]/moments/export/route.ts` | baru — CSV |
| `src/app/dashboard/events/[eventId]/moments/page.tsx` | baru — feed + export PDF via print stylesheet |

## 6. Acceptance Criteria

- [x] Tamu bisa kirim moment dengan/tanpa foto; skip tidak error. *(2026-08-28: POST anon 201 live; composer hanya tampil di fase saved — skip = tidak menekan tombol; jalur dengan photoId memvalidasi kepemilikan foto)*
- [x] Feed dashboard real-time (< 5 detik) seperti galeri. *(subscribe INSERT `moments` per event — pola identik galeri yang sudah live)*
- [x] Vendor bisa hide/show; hidden hilang dari feed & export. *(PATCH live 200; GET feed filter `is_hidden=false`; CSV export menyaring hidden)*
- [x] Rate limit aktif: moment kedua dalam 60 detik ditolak ramah. *(live: POST ke-2 → 429 "Satu momen cukup…" — bucket per meja + per IP)*
- [x] Anon tidak bisa membaca momen tamu lain (test PostgREST). *(live: GET anon → []; RLS `m_owner_all` to authenticated)*
- [x] Message > 280 char ditolak di API (bukan cuma maxlength UI). *(live: 281 char → 400. Catatan: batas final 280 char (database.md §2.8) — task ini awalnya menulis 140)*
- [x] Export CSV berisi data benar, hidden terkecuali. *(tombol Unduh CSV di feed — kolom id/waktu/meja/foto/isi, BOM UTF-8)*
- [x] Export PDF. *(2026-08-28: halaman cetak `/print/[eventId]/moments` — print browser → PDF A4; hanya momen tidak tersembunyi; break-inside avoid)*

## 7. Catatan

Prioritas tertinggi Phase 2 — ini jawaban "kenapa TEMORA, bukan Invrame". Ukur: % foto yang diberi caption (target ≥ 30%) sebagai metrik resonansi brand.

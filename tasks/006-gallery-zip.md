# Task 006 — Galeri Cloud + ZIP Download

*Status: Ready · Prioritas: High · Phase: MVP*

Depends on: 002, 004

---

## 1. Tujuan

Vendor melihat semua foto tamu real-time dan mengunduh semuanya sebagai satu ZIP resolusi tinggi.

## 2. Scope

- Halaman `/dashboard/events/[eventId]/gallery`.
- Grid foto (thumbnail dari bucket `thumbs`), infinite scroll / load-more.
- Realtime refresh: subscribe Supabase Realtime pada insert `photos` (foto baru muncul tanpa reload).
- Lightbox preview full-size (signed URL).
- Download ZIP: API route stream — fetch semua foto dari Storage → JSZip server-side → upload ke bucket `zips` → return signed URL 15 menit.
- Progress indicator saat generate ZIP (count foto).
- Hapus foto individual (dengan konfirmasi) — hapus Storage object + row.
- TTL cleanup: route `GET /api/cron/photo-ttl` + entri di `vercel.json` (architecture.md §12).

## 3. Non-Scope

- ❌ Edit/filter foto (backlog).
- ❌ Fitur Moments caption (task 012, Phase 2).
- ❌ Share galeri publik ke tamu (privasi by default).

## 4. Desain

### 4.1 ZIP generation strategy

| Jumlah foto | Strategi |
|---|---|
| ≤ 100 | Sinkron di request (stream response langsung) |
| > 100 | Background job + polling status; vendor dapat link saat selesai |

MVP target 500 foto/event → wajib jalur background job.

Job background wajib **resumable**: state/progress tersimpan persisten (metadata object di bucket `zips` atau tabel log ringan) sehingga polling client tetap berlanjut walau invocation timeout/restart — jangan andalkan satu invokasi panjang Vercel Functions.

### 4.2 Empty state (design-system §3.6)
*"Belum ada momen yang terabadikan. Bagikan QR code-nya dulu, ya."* + CTA ke halaman QR.

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `src/app/dashboard/events/[eventId]/gallery/page.tsx` | baru |
| `src/components/gallery/PhotoGrid.tsx` | baru |
| `src/components/gallery/Lightbox.tsx` | baru |
| `src/app/api/events/[id]/photos/route.ts` | baru (list paginated) |
| `src/app/api/events/[id]/photos/zip/route.ts` | baru |
| `src/app/api/events/[id]/photos/[photoId]/route.ts` | baru (delete) |
| `src/app/api/cron/photo-ttl/route.ts` | baru — TTL cleanup |
| `vercel.json` | tambah cron §12 (koordinasi task 008/009/015) |

## 6. Acceptance Criteria

- [ ] Foto baru dari HP tamu muncul di grid < 5 detik tanpa reload.
- [ ] ZIP 500 foto berhasil dibuat & terunduh utuh (verify count + bisa dibuka).
- [ ] Signed URL expired setelah 15 menit.
- [ ] Delete foto menghilangkan file Storage + row DB.
- [ ] Grid tetap smooth di 500+ foto (virtualisasi/pagination).
- [ ] Cron TTL terdaftar dan log berjalan.

## 7. Catatan

Jangan load full-size image di grid — selalu thumb_path. Full hanya di lightbox on-demand.

Shell statis awal dengan data demo (`src/lib/demo.ts`) sudah digantikan implementasi penuh saat task ini dikerjakan — file demo dihapus. Seluruh acceptance criteria diverifikasi sesuai status di `docs/qa-report.md`.

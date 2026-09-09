# Task 004 — Photobooth Page (WebRTC + Frame + Capture)

*Status: Selesai (2026-08-28) — seluruh AC terverifikasi (manual owner + Lighthouse ≥85) · Prioritas: High · Phase: MVP ⭐ CORE FEATURE*

Depends on: 002 (buckets + RLS), 005 (tables/QR agar bisa diakses tamu — boleh paralel dengan URL manual)

---

## 1. Tujuan

Halaman inti produk: tamu buka link → izin kamera → foto dengan frame overlay → upload ke Storage. Ini yang menentukan kesan pertama brand TEMORA.

## 2. Scope

- Route `/p/[eventId]/[tableId]`.
- Consent screen privasi sebelum kamera aktif (design-system §3.7).
- WebRTC `getUserMedia` dengan `facingMode: 'user'`, fallback ke environment camera.
- Frame overlay PNG transparan (dari `events.frame_url`) via canvas compositing.
- Capture → kompres JPEG (~85%, target < 800KB) → preview → retake atau simpan.
- Upload via API route (`admin.ts` service role) → Storage `photos/{event}/{table}/` + insert row `photos`.
- Client kirim `client_upload_id` (UUID per capture) — server dedup saat retry offline (return existing row, bukan duplikat).
- Thumbnail 320px (client-side canvas resize) → bucket `thumbs`.
- Watermark teks brand di hasil akhir.
- Tombol "Simpan ke HP" / bagikan di preview: Web Share API (`navigator.share`) dengan blob JPEG yang sudah ada; fallback unduh langsung bila API tidak tersedia. Tracking: `POST /api/events/[id]/photos/[photoId]/saved` dengan `capture_token` → set `guest_saved_at`.
- Rate limit upload server-side: ±12 foto/menit per meja (+ fallback per IP) — tolak dengan pesan ramah.
- Consent screen memuat link kecil ke `/privacy`.
- scan_count: `POST /api/events/[id]/tables/[tableId]/scan` + guard sessionStorage (max 1× per sesi buka halaman).
- Error states: kamera ditolak, koneksi gagal (retry queue), event expired/nonaktif.

## 3. Non-Scope

- ❌ Video/GIF mode (backlog).
- ❌ AR filters/props (dihapus dari scope produk).
- ❌ Galeri publik untuk tamu (tamu tidak bisa lihat foto orang lain — by design).

## 4. Desain

### 4.1 Alur UX (mobile-first, design-system §4)

```
Consent ("Oke, Mengerti")
  → kamera live + frame overlay + watermark
  → tap CaptureButton bulat besar
  → freeze frame + preview ("Simpan" primary / "Ulangi" ghost)
  → simpan: optimistic thumbnail muncul di strip bawah
  → toast "Momen tersimpan ✨"
```

### 4.2 Compositing

```
crop video → rasio kanonik 3:4 (center x, top-bias y; design-system §3.3)
scale → sisi terpanjang ≤ 1440px (output umum 1080×1440)
draw video → draw frame (object-contain center) → draw watermark text
toDataURL('image/jpeg', 0.85)
```

> Frame template wajib **3:4** (rekomendasi 1080×1440) agar `object-contain`
> menutupi penuh — spek di design-system §3.3.

### 4.3 Upload resilience

Jika fetch gagal: simpan blob ke IndexedDB → auto-retry saat online kembali (event listener `online`). Tamu lihat status kecil "menyimpan…".

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `src/app/p/[eventId]/[tableId]/page.tsx` | Baru — server component fetch event |
| `src/components/photobooth/CameraStage.tsx` | Baru |
| `src/components/photobooth/ConsentScreen.tsx` | Baru |
| `src/app/api/events/[eventId]/photos/upload/route.ts` | Baru — validasi + dedup + upload + insert |
| `src/app/api/events/[eventId]/photos/[photoId]/saved/route.ts` | Baru — set guest_saved_at |
| `src/app/api/events/[eventId]/tables/[tableId]/scan/route.ts` | Baru — increment scan_count |

## 6. Acceptance Criteria

- [x] Di HP Android + iOS Safari: kamera aktif, capture, tersimpan (test manual).
- [x] Foto hasil = video + frame + watermark, orientasi benar.
- [x] Ukuran upload < 800KB untuk foto tipikal.
- [x] Kamera ditolak → layar fallback dengan instruksi izin, tanpa crash.
- [x] Event nonaktif/expired → halaman sopan "acara sudah berakhir".
- [x] Upload gagal offline → tersimpan lokal, terkirim saat online lagi.
- [x] Limit foto event tuntas → tombol capture nonaktif + pesan ramah.
- [x] Simpan/Bagikan sukses di Android Chrome + iOS Safari; fallback unduh jalan di browser tanpa Web Share.
- [x] Rate limit menolak spam upload dengan pesan ramah (bukan error mentah).
- [x] `guest_saved_at` tercatat saat tamu menyimpan/membagikan foto.
- [x] scan_count bertambah maksimal sekali per sesi buka halaman.
- [x] Retry offline dengan client_upload_id yang sama tidak membuat duplikat foto.
- [x] Lighthouse mobile ≥ 85 performance. *(2026-08-28: perf 99, a11y 95 — bukti docs/lighthouse/photobooth.json)*

> Terverifikasi manual oleh owner (2026-08-28): seluruh AC di atas lulus uji nyata di Android + iOS.

## 7. Catatan

iOS Safari butuh `playsInline` + `muted` pada `<video>` dan user gesture sebelum play — jangan autoplay sebelum consent diklik.

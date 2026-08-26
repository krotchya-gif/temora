# PRD: TEMORA — Virtual Photobooth for the Moments That Matter

*Versi: 1.2 · Tanggal: 2026-08-25 · Status: Approved*
*Konsolidasi v1.0 + riset kompetitor. Patch logika v1.2: [database.md](database.md) §2.7 · Keputusan terkunci: [README.md](../README.md) §Keputusan Terkunci*

---

## 1. Overview

**TEMORA** adalah platform SaaS **virtual photobooth** untuk vendor event (WO, fotografer, event organizer) yang memungkinkan tamu mengambil foto berbingkai kustom langsung dari browser HP — tanpa instalasi aplikasi, tanpa alat photobooth fisik.

> **Keep the moments close.**

TEMORA bukan sekadar layanan photobooth. TEMORA berfokus pada **momen dan hubungan di balik foto** — tawa bersama, kedekatan, spontanitas.

### Keputusan Final (approved by Near, 2026-08-24)

| # | Keputusan | Pilihan |
|---|-----------|---------|
| 1 | Nama project | `temora` |
| 2 | Payment gateway (MVP) | **Xendit** |
| 3 | WhatsApp API (MVP) | **Ya** — aktivasi vendor + notifikasi |
| 4 | Fitur Moments | **Phase 2** |
| 5 | Logo | Placeholder dulu |
| 6 | Tipografi (konsolidasi) | Cormorant Garamond + Plus Jakarta Sans |

---

## 2. Persona & Target

| Persona | Goals | Pain Points |
|---------|-------|-------------|
| **Wedding Organizer** | Engagement tamu, diferensiasi, revenue tambahan | Alat photobooth fisik mahal, foto tamu sulit dikelola |
| **Fotografer** | Layanan photobooth tanpa alat tambahan | Setup alat repot, hasil tidak terorganisir |
| **Event Organizer / Corporate** | Lead capture, branding konsisten, ROI acara | Tamu tidak engage, sulit ukur dampak |
| **Tamu Acara** (Gen Z/Millennials/Couples) | Foto fun & instagrammable, instan | Malas install app, antri, hasil generik |

**Event types**: wedding, engagement, birthday, anniversary, family gathering, reunion, graduation, community event, corporate event, brand activation, private party.

---

## 3. Fitur (MoSCoW)

### MUST — MVP (target ~2 minggu kerja efektif)

1. **Photobooth Page (Tamu)** — `/p/[eventId]/[tableId]`
   - Akses kamera via WebRTC (`getUserMedia`), mobile-first.
   - Frame overlay PNG transparan (per event).
   - Capture → preview → retake/simpan.
   - Tombol "Simpan ke HP" / bagikan di layar preview (Web Share API) — pengukur north star.
   - Watermark brand vendor/TEMORA.
   - Tanpa login untuk tamu (cukup scan QR).

2. **QR Code Kartu Meja**
   - Generate QR unik per meja per event.
   - Halaman print-ready (A4 grid, siap cetak).

3. **Galeri Cloud + ZIP Download**
   - Foto tersimpan di Supabase Storage.
   - Vendor lihat galeri real-time, unduh semua sebagai ZIP resolusi tinggi.

4. **Vendor Dashboard**
   - Auth via Supabase Auth (email/password).
   - CRUD events (nama, tanggal, tema, frame upload).
   - Generate tabel + QR codes.
   - Galeri + download ZIP.

5. **Monetisasi — Xendit**
   - Subscription tier (detail enforcement: [database.md](database.md) §2.7):
     - **Free**: 1 event aktif (unlimited nonaktif), max 100 foto/event.
     - **Basic**: Rp 99K/bulan — 3 event aktif, 500 foto/event.
     - **Pro**: Rp 299K/bulan — unlimited event aktif, unlimited foto (`photo_limit` NULL), custom watermark.
   - `photo_limit` diset saat create event; tidak di-sync ulang saat upgrade tier.
   - Invoice + payment link via Xendit; webhook untuk konfirmasi.

6. **WhatsApp Integration**
   - Aktivasi akun vendor dibantu admin via WhatsApp (deep-link `wa.me`).
   - Notifikasi WA ke vendor: event baru dibuat, milestone foto (misal 50/100 foto), invoice.

7. **Deployment & QA** *(tambahan konsolidasi)*
   - CI/CD pipeline + monitoring + test suite — lihat tasks 015–016.

### SHOULD — Phase 2

8. **Fitur Moments** — caption/title per foto, guestbook digital.
9. **AR Filters & Virtual Props** — MediaPipe Tasks Vision / TensorFlow.js.
10. **Green Screen** — background replacement client-side (segmentation).
11. **AI Frame Suggestions**.
12. **Analytics Dashboard** — foto per meja, heatmap waktu puncak.
13. **Live Photo Wall** — slideshow real-time di layar besar venue.

### COULD — Phase 3

14. Sponsorship slots (logo sponsor di frame/QR/slideshow).
15. AI Slideshow (video recap otomatis).
16. Lead capture → CRM export.
17. Multi-device sync.
18. Voice commands ("Cheese!").
19. White-labeling domain kustom per vendor.

### WON'T (saat ini)

20. NFT minting.
21. 3D depth photos.
22. Native mobile app (tetap web-based).
23. Facial recognition / identitas tamu (privasi — hanya segmentasi & landmark, tidak identifikasi).

---

## 4. Metrik Sukses

| Metrik | MVP (bulan 1) | Bulan ke-6 |
|--------|---------------|------------|
| Vendor aktif | 10 | 75 |
| Event berjalan | 20 | 400 |
| Foto terkumpul | 2.000 | 60.000 |
| Revenue MRR | Rp 1JT | Rp 15JT |
| Vendor retention (bulan-2) | 60% | 80% |

**North star metric:** jumlah foto yang benar-benar diunduh/dibagikan tamu (bukan cuma diambil) — proxy bahwa momennya "kept close". Sumber data: kolom `photos.guest_saved_at` via tombol Simpan/Bagikan tamu — metrik terukur, bukan asumsi.

---

## 5. Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Koneksi venue lemah → gagal upload | Compress di client (canvas → JPEG ~80%), retry queue (IndexedDB), fallback simpan lokal |
| Privasi foto tamu | Event punya TTL auto-delete (default 30 hari), consent screen saat buka photobooth; tamu TIDAK bisa baca foto orang lain (RLS) |
| Penyalahgunaan (foto sensitif) | Rate limit upload server-side (per meja/IP); moderasi oleh vendor (hapus/tandai foto); tamu tidak bisa browsing foto orang lain (RLS) |
| Abuse free tier | Limit event/foto enforced server-side (RLS + check di API — defense in depth) |
| Xendit webhook gagal | Idempotent webhook handler + reconciliation job harian |
| Browser compatibility kamera | Fallback instruksi izin jelas; deteksi dukungan `getUserMedia` |
| Kompetitor (Invrame dll) | Diferensiasi di brand warmth + UX tamu + fitur moments (Phase 2) — detail: [competitor-analysis.md](research/competitor-analysis.md) |

---

## 6. Success Criteria MVP

- [ ] Tamu bisa ambil foto < 10 detik setelah scan QR (di 4G).
- [ ] Vendor setup event lengkap (frame + QR) < 15 menit.
- [ ] ZIP download berfungsi untuk 500+ foto.
- [ ] Pembayaran Xendit end-to-end (invoice → paid → tier naik otomatis).
- [ ] Notifikasi WA terkirim untuk 6 kind (welcome, event_created, photo_milestone, invoice, payment_ok, expiry_reminder).
- [ ] Tamu bisa simpan/bagikan fotonya sendiri dari layar preview (Android + iOS).
- [ ] Lighthouse mobile ≥ 85 performance di halaman photobooth.

---

## 7. Open Questions

1. Offline mode penuh untuk venue koneksinya sangat lemah — seberapa jauh harus didukung di MVP+? *(MVP: retry queue + `client_upload_id` dedup sudah cukup — lihat architecture.md §4.1)*
2. Integrasi platform event management (WeddingWire, Eventbrite) — prioritas atau tidak?
3. Monetisasi fitur tamu (AR filters premium per event vs bundle tier)?

### Resolved (v1.2)

4. ~~Guest data (nama/email) wajib atau tetap anonim?~~ → **Tamu anonim sepenuhnya di MVP** (tanpa nama/email wajib). Lihat database.md §7.
5. **Showcase Moments** (enhancement pasca-MVP, 2026-08-26): galeri kurasi platform yang diinput superadmin — tampil di landing (rope interaktif "tali momen") dan halaman publik `/moments`. Konten eksklusif kurasi admin; foto tamu vendor tetap privat (keputusan #8). Detail: `todo.md` root.

---

## 8. Referensi

- Brand: `docs/BRAND.md`
- Arsitektur: `docs/architecture.md`
- Design system: `docs/design-system.md`
- Database: `docs/database.md`
- Riset kompetitor: `docs/research/competitor-analysis.md`

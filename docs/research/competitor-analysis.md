# Riset Kompetitor — Virtual Photobooth

*Sumber: konsolidasi analisis PRD draft + riset eksternal `artifacts/research/photobooth-virtual-competitor-analysis.md` (arsip lama).*

---

## 1. Lanskap Kompetitor

| Competitor | Strengths | Weaknesses | TEMORA's Edge |
|-------------|-----------|------------|---------------|
| **Invrame** | Virtual photobooth, QR check-in, aktivasi vendor via WhatsApp | Manual chroma key, no AI, basic UX, tanpa fitur momen | Brand warmth, UX tamu mobile-first, fitur Moments (Phase 2), green screen AI |
| **Photobooth.ID** | Opsi fisik + virtual | Butuh tablet/PC di lokasi, no AI | 100% browser — tanpa alat fisik sama sekali |
| **Framebooth** | Custom frames, social sharing | No gamification/moments, analytics basic | Moments/guestbook, analytics terukur, ZIP resolusi tinggi |

## 2. Posisi TEMORA

TEMORA **bukan** bersaing di fitur teknis semata. Diferensiasi:

1. **Emosional** — "moments over photos": guestbook digital, caption, copy UI hangat.
2. **Zero friction** — tamu scan QR → foto < 10 detik; vendor setup < 15 menit.
3. **Vendor-first business model** — SaaS subscription (Xendit), bukan rental per event.

## 3. Inspirasi

- **Apple "Shot on iPhone"** — merayakan momen otentik, bukan hasil staging.
- **Instagram Stories** — sharing effortles, efek playful.
- **Polaroid** — nostalgia & tangible memory (jadi signature moment develop animation).

## 4. Implikasi ke Roadmap

| Temuan Riset | Aksi |
|---|---|
| Kompetitor tidak punya fitur momen/guestbook | Task 012 (Moments) = prioritas tertinggi Phase 2 |
| Green screen manual/chroma key fisik | Task 011 (segmentation client-side) = add-on berbayar Rp 15–30K/event |
| Analytics kompetitor basic | Task 014 fokus ke north star: download/share rate |
| Aktivasi WA terbukti works (Invrame) | Dipertahankan di MVP (task 009), dibakukan prosesnya |

## 5. Watchlist

Pantau tiap kuartal: harga tier kompetitor, fitur baru, ulasan vendor di komunitas WO/fotografer Indonesia. Update dokumen ini saat ada perubahan signifikan.

## 6. Riset Morements & Invistory (2026-09-11)

| Referensi | Temuan | Implikasi TEMORA |
|---|---|---|
| Morements | Homepage minimal dan brand-led; guest camera immersive dengan nama event, tanggal, filter/frame, zoom, kamera, sisa kuota, dan galeri. Pricing memakai kuota tamu. | Homepage TEMORA tidak perlu penuh fitur. Guest camera harus terasa seperti produk event yang dikonfigurasi vendor, bukan kamera generik. |
| Invistory | Homepage menjelaskan platform lewat feature blocks, mockup dashboard, pricing, dan alur tiga langkah. | Homepage TEMORA perlu menjelaskan flow vendor: buat event → custom tampilan → bagikan QR → kumpulkan momen. |

Keputusan UX: konfigurasi kamera tamu adalah milik event. Vendor memilih cover, frame,
preset kamera, filter, watermark, dan kuota di setup event; guest camera membaca
konfigurasi itu dari server dan tidak menyediakan override filter/preset untuk tamu.

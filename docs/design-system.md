# Design System — TEMORA

*Versi: 1.2 · Tanggal: 2026-08-25 · Status: Approved*
*Konsolidasi: token & microcopy v1.0 (kanonik) + motion, imagery & brand assets dari draft lanjutan.*
*Brand foundation: [BRAND.md](BRAND.md)*

---

## 1. Prinsip

TEMORA harus terasa **warm, intimate, playful, personal** — seperti album foto yang dicintai, bukan produk tech.

1. **Moments over features** — UI berbicara tentang momen, bukan spesifikasi teknis.
2. **Warm minimalism** — minimal tapi hangat; ivory & earth tones, bukan putih steril.
3. **Human voice** — microcopy pakai brand voice ("Ambil Momen", bukan "Capture Image").
4. **Nostalgic over trendy** — sentuhan vintage halus (Polaroid), tanpa jadi retro norak.
5. **Mobile-first selalu** — 90%+ tamu akses via HP; dashboard responsive.

Setiap keputusan desain harus menjawab satu pertanyaan: *"Apakah ini membuat momennya terasa lebih dekat?"*

---

## 2. Design Tokens

### 2.1 Warna (dari BRAND.md §8 — kanonik)

| Token | Value | Penggunaan |
|---|---|---|
| `bg-base` | `#F9F6F1` | Latar utama (warm ivory) |
| `bg-card` | `#FFFFFF` | Card surface |
| `bg-warm` | `#F3EDE4` | Section alternatif (soft cream) |
| `text-primary` | `#3D3A36` | Teks utama (soft brown-black) |
| `text-secondary` | `#6B6660` | Teks sekunder |
| `accent` | `#8B7355` | Aksi utama (earthy brown) |
| `accent-hover` | `#75614a` | Hover state accent |
| `accent-secondary` | `#D4A574` | Highlight sekunder (soft gold) |
| `dusty-blue` | `#8FA8B8` | Tag/informasi kalem, focus ring |
| `muted-mauve` | `#A48B94` | Aksen emosional (moments) |
| `success` | `#7C9A6D` | Konfirmasi (sage green, bukan neon) |
| `warning` | `#C9A961` | Status pending |
| `danger` | `#B56A5E` | Error/hapus (terracotta lembut) |
| `border` | `#E8E1D6` | Border halus |

Aturan: tidak ada hardcode hex baru di kode — semua lewat token. Warna di luar daftar ini butuh update docs dulu. Glow/gradient lembut boleh dibuat dari token existing dengan alpha (utility `.bg-glow-accent` = `accent-secondary` ±16% via `color-mix`), tanpa hex baru.

### 2.2 Variasi Tema Event

Tema event menggeser accent saja; core palette tetap:

| Tema Event | Accent |
|------------|--------|
| Wedding | `muted-mauve` |
| Birthday | `dusty-blue` |
| Corporate | `accent` (earthy brown) |
| Graduation / Community | `accent-secondary` (soft gold) |

Implementasi: CSS custom property per event (`--event-accent`) yang menimpa token accent di scope halaman photobooth event tsb.

### 2.3 Tipografi

| Token | Font | Penggunaan |
|---|---|---|
| `font-display` | Cormorant Garamond | Judul, nama event, tagline, logo wordmark |
| `font-body` | Plus Jakarta Sans | Body, button, form |
| `font-mono` | JetBrains Mono | QR data, angka analytics, token |

Load via `next/font/google` dengan `display: swap`.

| Level | Size | Weight | Line-height |
|---|---|---|---|
| Display/Hero | 40–48px | 600 | 1.15 |
| H1 | 32px | 500–600 | 1.2 |
| H2 | 24px | 500 | 1.25 |
| H3 | 18px | 600 | 1.35 |
| Body | 15–16px | 400 | 1.6 |
| Small | 13px | 400 | 1.5 |
| Caption/Label | 12px | 500 | 1.4 |

Wordmark "TEMORA": Cormorant Garamond, letter-spacing +50 tracking.

### 2.4 Spacing, Radius, Shadow

- Grid: 4px base · padding section 24px · gap komponen 12–16px
- Radius: `sm` 6px · `md` 10px · `lg` 14px · `xl` 16px (card) · `full` untuk tombol capture
- Shadow sangat halus: `0 2px 8px rgba(61,58,54,0.06)` — depth lembut, bukan glassmorphism
- Card hover: lift halus `translate-y(-2px)` + shadow bertambah tipis

### 2.5 Implementasi Tailwind CSS 4

Token §2.1–2.4 diterapkan via `@theme` di `src/app/globals.css` — **bukan** hardcode hex di komponen.

```css
@import "tailwindcss";

@theme {
  --color-bg-base: #F9F6F1;
  --color-bg-card: #FFFFFF;
  --color-bg-warm: #F3EDE4;
  --color-text-primary: #3D3A36;
  --color-text-secondary: #6B6660;
  --color-accent: #8B7355;
  --color-accent-hover: #75614a;
  --color-accent-secondary: #D4A574;
  --color-dusty-blue: #8FA8B8;
  --color-muted-mauve: #A48B94;
  --color-success: #7C9A6D;
  --color-warning: #C9A961;
  --color-danger: #B56A5E;
  --color-border: #E8E1D6;
  --font-display: var(--font-cormorant);
  --font-body: var(--font-jakarta);
  --font-mono: var(--font-jetbrains);
}
```

Font load via `next/font/google` di `src/app/layout.tsx`; bind ke CSS variable (`--font-cormorant`, dll.). Tidak perlu `tailwind.config.ts` kecuali plugin khusus — task 001 cukup `globals.css` + PostCSS default Next.js 16.

---

## 3. Komponen Inti

### 3.1 Button
```tsx
// Primary — aksi utama
<button className="rounded-lg bg-accent px-5 py-2.5 font-medium text-white
                   shadow-sm transition-colors hover:bg-accent-hover">
  Ambil Momen
</button>

// Secondary — outline hangat
<button className="rounded-lg border border-accent/30 px-5 py-2.5 font-medium text-accent
                   transition-colors hover:bg-accent/10">
  Simpan ke Galeri
</button>

// Ghost
<button className="rounded-lg px-4 py-2 text-sm text-text-secondary hover:bg-bg-warm">
  Nanti Saja
</button>
```

### 3.2 CaptureButton (photobooth)
- Bulat besar (`w-20 h-20 rounded-full bg-accent`), ring putih tipis.
- Label di bawah: "Tap untuk ambil momen".
- Scale pulse saat ditekan (150ms) — bukan bounce norak.

### 3.3 CameraPreview
```tsx
<div className="relative overflow-hidden rounded-xl shadow-md">
  <video autoPlay playsInline muted className="h-full w-full object-cover" />
  {/* Frame overlay PNG transparan */}
  <img src={frameUrl} alt="" aria-hidden
       className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
</div>
```

**Rasio capture kanonik: 3:4 portrait (locked, 2026-08-26).**
- Hasil foto **selalu 3:4** lintas device — canvas di-*crop* ke 3:4 lalu di-scale
  ke sisi terpanjang ≤ 1440px (output umum `1080×1440`). Implementasi:
  `CameraStage.tsx` capture + `src/lib/capture.ts`.
- **Crop = object-cover centered** (revisi 2026-08-28, menggantikan bias-atas):
  identik dengan preview CSS → **preview == hasil** (WYSIWYG). Prop AR & semua
  overlay dihitung dalam ruang crop yang sama (`toCropSpace`).
- Konsekuensi frame: template frame **harus 3:4** agar `object-contain` menutupi
  penuh foto. Ukuran rekomendasi **1080×1440 px** (PNG transparan, window subjek
  di tengah-atas). Rentang validasi route frame: min side 480 / max side 2560.
- Preview (`aspect-[3/4]`) sejajar dengan hasil jadinya — tidak ada beda framing.

### 3.4 Photo Frame Polaroid (signature component)
Hasil foto distyle seperti Polaroid:
- Border putih lebih tebal di bawah.
- Area caption handwritten-style (dipakai fitur Moments, task 012).
- Film grain overlay sangat halus (opsional, matikan jika mengurangi kejelasan).
- Slight rotation on hover di galeri dashboard (playful).
- Perlakuan yang sama dipakai untuk foto placeholder halaman marketing: rotasi statis halus (±2°), caption display italic, hover lurus sejajar; foto "develop" saat pertama tampil (pudar → tajam ±800ms, sesuai §5) — hormati `prefers-reduced-motion`.

### 3.5 EventCard (dashboard)
```tsx
<div className="rounded-xl border border-border bg-card p-5 shadow-xs">
  <p className="text-xs uppercase tracking-wide text-dusty-blue">Wedding</p>
  <h3 className="mt-1 font-display text-lg text-text-primary">Andi &amp; Sinta</h3>
  <p className="mt-0.5 text-sm text-text-secondary">24 Agt 2026 · 142 foto</p>
  <div className="mt-4 flex gap-2">{/* actions */}</div>
</div>
```

### 3.5a Event setup studio (dashboard vendor)
Halaman buat/edit event memakai pola "setup studio" yang terinspirasi editor
event visual: form tetap menjadi sumber perubahan, tetapi selalu ditemani
preview perangkat yang memperlihatkan hasilnya secara langsung.

- Layout desktop dua kolom: pengaturan di kiri, preview sticky di kanan; mobile
  berubah menjadi satu kolom dengan preview di bagian atas.
- Urutan section: identitas & jadwal, cover/frame, tampilan kamera, lalu
  watermark dan status. Setiap section punya judul, deskripsi singkat, dan
  whitespace yang cukup — bukan satu form panjang tanpa orientasi.
- Cover dashboard adalah layar pembuka tamu yang dikonfigurasi terpisah dari
  frame foto. Editor cover menyimpan template, foto opsional, judul, subjudul,
  dan teks tombol; frame foto tetap wajib PNG transparan rasio 3:4 sesuai §3.3.
- Tema event mengubah aksen preview memakai token tema §2.2. Tidak boleh ada
  hex baru atau warna pilihan yang hanya tersimpan di client.
- Form setup menyediakan pilihan preset kamera dan filter default. Preview
  perangkat di sisi kanan memperbarui shell kamera, label preset, treatment
  warna, frame, dan watermark secara live saat kontrol berubah; hasil final
  tetap mengikuti konfigurasi yang disimpan.
- Setup yang sama menyediakan pengaturan kartu QR: template visual, judul,
  subjudul, dan tagline. Preview kartu memakai copy sementara yang sama dengan
  halaman print A4; QR tetap valid, tidak diubah bentuknya, dan ukurannya tetap
  minimal 4×4 cm.
- Konfigurasi event kanonik: `camera_preset` (`darkroom`, `rose-gold`,
  `berry-pop`, `mono-minimal`), `filter_id` (null = Warna Asli), dan
  `filter_strength` (0–1). Nilainya disimpan di database, divalidasi server,
  dan diteruskan ke guest camera melalui server-rendered event state.
- Guest camera membaca cover, frame, filter, preset kamera, watermark, kuota,
  dan aksen tema dari event yang sama. Filter aktif diterapkan ke preview live
  dan hasil capture; preset kamera saat ini mengubah aksen ring dan label preset
  pada shell kamera yang dipakai bersama. Guest tidak boleh mengubah
  filter/preset; vendor mengubahnya dari setup event.
- CTA utama memakai microcopy "Simpan perubahan" atau "Simpan event". Link
  sekunder membuka photobooth/QR setelah event tersimpan.
- Editor cover visual memakai preview perangkat portrait di tengah, navigasi
  template kiri/kanan, indikator posisi, dan empat kontrol ringkas: Foto, Judul,
  Subjudul, Tombol. Tombol "Selesai" menyimpan cover ke event.
- Semua preview lokal harus diberi alt yang jelas, fokus keyboard terlihat, dan
  motion dihentikan saat `prefers-reduced-motion` aktif.

### 3.6 EmptyState
Ilustrasi line-art sederhana + satu kalimat brand voice.
Contoh galeri kosong: *"Belum ada momen yang terabadikan. Bagikan QR code-nya dulu, ya."*

### 3.7 ConsentScreen (privacy tamu)
Muncul sebelum kamera aktif:
- Penjelasan singkat: foto disimpan, siapa yang bisa lihat, TTL hapus otomatis.
- Link kecil ke `/privacy` (kebijakan privasi lengkap).
- Jika event punya sponsor di frame → wajib disebut di sini (task 013).
- CTA: "Oke, Mengerti" (primary).

### 3.8 QR Table Card (print)
- A6 size (105×148mm), grid A4 2×4.
- QR min 4×4 cm, error correction level M.
- Nama event font-display, nomor meja jelas, tagline kecil: *"Keep the moments close."*
- Background warm ivory.
- Sponsor QR aktif (task 013): logo kecil (≤ 28px tinggi) di pojok kartu, tidak
  mengecilkan QR (QR tetap ≥ 4×4 cm).

### 3.9 Efek (task 011, Phase 2)
- **Green screen**: pilihan background bawaan (warm gradient via `color-mix`,
  pola titik, bingkai solid) + preview thumb. Efek menggantikan video area saat
  live; hasil capture = composited background + subjek + frame.
- **Color filter (3D LUT), kurasi 2026-09-09**: tujuh look aktif: Lembut
  (Portra, 55%), Hangat (Cobi, 70%), Merona (Remy, 50%), Sejuk (Lenox, 45%),
  Vintage (Faded, 65%), Cerah (Ektar, 65%), Monokrom (Tri-X, 100%). Kurasi
  memprioritaskan variasi karakter dan intensitas moderat untuk foto wajah;
  bukan jaminan cocok di semua pencahayaan. Filter lain dihapus dari aset
  publik. Manifest dan fallback memakai katalog kurasi yang sama; sync tidak
  boleh mengaktifkan semua file secara otomatis. Nama ini sekaligus microcopy
  pilihan filter. Intensitas 0–100% berada di baris terpisah yang selalu
  terlihat. Memilih look baru memakai default look tersebut. Warna Asli
  mengembalikan warna sumber. Capture menunggu frame filter siap.
- **Frame event**: upload hanya menerima PNG transparan dengan rasio portrait
  **3:4** (toleransi kecil untuk pembulatan dimensi), sehingga frame memenuhi
  kanvas hasil tanpa letterbox atau crop tak terduga. Preview dan compositing
  memakai posisi yang sama (`object-contain` di dalam kanvas 3:4).
- Fitur AI yang tersisa **lazy-load** sesuai kebutuhan (MediaPipe untuk green
  screen / fetch `.cube` untuk LUT). Tombol "Warna Asli" selalu tersedia
  (fallback, §8.3); "Tanpa Latar" hanya tampil saat green screen diaktifkan.
- **Status:** AR props dihapus dari produk. Green screen tetap di kode namun
  OFF sementara (`feature-flags.ts`); Filter warna aktif.

### 3.10 Moments Feed (task 012)
- Kartu moment: foto (bila ada) + caption italic display + timestamp kecil.
- Feed dashboard: grid 2 kolom mobile → 4 desktop, realtime (pola PhotoGrid).
- Toggle hide/show per kartu (ikon mata), hidden → blur preview + badge.
- Promp tamu (setelah simpan foto): satu input + tombol, design-system §6 copy.

### 3.11 Analytics (task 014)
- Stat cards: angka display font + label kecil (total foto, momen, scan, simpan).
- Heatmap jam: grid 24 kolom, intensitas via `color-mix(accent, transparent)` —
  tanpa hex baru; tooltip teks.
- Bar per meja: div dengan `bg-accent` + tinggi proporsional; label mono.

---

## 4. Layout

### Homepage hero (brand-led)

Homepage memakai hero minimal berpusat pada wordmark TEMORA, tetapi tetap
menunjukkan product proof melalui mockup HP portrait di samping/bawah brand
stage. Mockup menampilkan guest camera TEMORA (nama event, frame, filter, sisa
foto, shutter, dan galeri) dengan animasi masuk yang lembut. Interaksi hover
pointer atau focus keyboard pada wordmark memunculkan ikon kamera dan lingkaran
aksen halus. Pada layar sentuh mockup tetap terlihat tanpa bergantung pada
hover. Homepage masih memiliki section pendukung cara kerja, showcase momen,
dan CTA akhir di bawah hero; visual hero bukan lagi stock photo.

### Moments archive (`/moments`)

Halaman Moments adalah editorial archive, bukan dashboard galeri: hero memakai
eyebrow dan headline display yang tenang, CTA vendor sekunder, lalu masonry
gallery dengan variasi rotasi halus. Card foto menampilkan judul/caption,
memberi lift saat hover/focus, dan membuka lightbox untuk melihat momen lebih
besar. Empty state tetap menjelaskan bahwa kurasi sedang disiapkan.

### Photobooth Page (mobile-first, `min-h-dvh`)
```
┌──────────────────────┐
│  Event name (display)│
│  Meja 5 · tagline    │
├──────────────────────┤
│                      │
│   Camera preview     │
│   + frame overlay    │
│   + watermark        │
│                      │
├──────────────────────┤
│   ( O ) Ambil Momen  │
├──────────────────────┤
│  strip thumbnail     │
└──────────────────────┘
```
Frame selector (jika >1 frame): horizontal scroll di atas preview.

### Dashboard (desktop-first, mobile drawer/bottom nav)
```
┌────────┬─────────────────────────────┐
│Sidebar │ Header (event switcher)     │
│Events  ├─────────────────────────────┤
│Galeri  │ Content grid                │
│Billing │                             │
│Settings│                             │
└────────┴─────────────────────────────┘
```
Max width konten `max-w-6xl`; padding `px-4 sm:px-6 lg:px-8`.

### Admin (sidebar desktop, drawer mobile)

- Desktop (`lg` ke atas): sidebar tetap selebar `w-64`; konten memakai offset
  `lg:pl-64` dan tetap dibatasi `max-w-6xl`.
- Mobile/tablet: navigasi utama tidak boleh menjadi baris link horizontal.
  Gunakan header sticky ringkas (wordmark + badge Admin) dan tombol hamburger
  minimal 44×44px yang membuka drawer dari kiri.
- Drawer wajib memiliki backdrop, status `aria-expanded`, label dialog, focus
  management, tutup lewat tombol X/Escape/pilih menu, serta mengunci scroll body
  selama terbuka. Transisi dimatikan pada `prefers-reduced-motion`.
- Tombol keluar ditempatkan di bagian bawah sidebar/drawer agar daftar menu tetap
  mudah dipindai pada viewport 360px.
- Daftar data admin memakai kartu berlabel pada viewport di bawah `lg`; tabel
  penuh hanya tampil saat ruang horizontal cukup. Mobile tidak mengandalkan
  horizontal scroll untuk aksi utama.
- Tab SEO tetap satu baris dan dapat di-scroll horizontal dengan indikator tab
  aktif; pilihan tab tersimpan pada query URL agar reload/back tetap konsisten.
- Semua filter, pagination, dan tombol aksi admin memiliki touch target minimal
  44px (`min-h-11`). Baris aksi harus membungkus (`flex-wrap`) pada layar sempit.
- Async panel wajib membedakan loading, error + retry, empty, dan success; tombol
  yang sedang mengirim request tidak dapat ditekan berulang.
- Editor Showcase menampilkan preview gambar per item, input judul, textarea
  kutipan, dan aksi "Ganti foto" + "Simpan perubahan". File yang baru dipilih
  harus terlihat sebagai preview lokal sebelum disimpan; error tetap mempertahankan
  draft. Semua aksi minimal 44px dan tersusun vertikal pada viewport sempit.

---

## 5. Motion

| Interaksi | Animasi | Durasi |
|-------------|-----------|----------|
| Transisi halaman | Fade + slide up halus | 300ms |
| Capture foto | Flash effect + **Polaroid develop** | 800ms |
| Card hover | Gentle lift | 200ms |
| Gallery load | Staggered fade-in | 50ms/item |
| Shutter press | Scale pulse | 150ms |
| **Tali Momen** (landing) | Kartu polaroid tergantung di tali; drag horizontal + inersia (friksi 0.94/frame, rAF) + infinite loop (set ×2, offset wrap); rotasi kartu golden-ratio ±2.5°; hover kartu → rotate(0) lift | inersia ~1–2s decay |
| Tali Momen — klik kartu | Overlay detail: fade backdrop + scale 0.96→1 + foto mainkan **polaroid develop** | 350ms · develop 800ms |
| Tali Momen — sway kontinu | Semua kartu bergoyang ±1.4° sekitar engsel gantung (3.8s alternate), delay fase negatif per kartu → gelombang alami; hover = pause sway | infinite |

**Signature moment**: setelah capture, foto "develop" seperti film instan — mulai sedikit pudar, lalu menajam selama 800ms. Ini identitas emosional TEMORA.

**Tali Momen** (task showcase): interaksi drag memakai pointer events native
(bukan delegasi React) agar mulus; `touchAction: pan-y` supaya scroll halaman
tetap hidup; threshold tap-vs-drag 6px; `prefers-reduced-motion` → **inersia
dimatikan total** (vel = 0 saat lepas), entrance animation dilewati. Semua
warna via token (`accent`→`accent-secondary` untuk tali, `bg-card` polaroid).

Semua animasi hormati `prefers-reduced-motion` (matikan develop/fade, langsung tampil).

---

## 6. Microcopy (Brand Voice)

| Konteks | Copy |
|---|---|
| Tombol capture utama | "Ambil Momen" |
| Setelah capture | "Momen tersimpan ✨" |
| Upload gagal | "Koneksi lagi ngambek. Coba sekali lagi?" |
| Empty state galeri | "Belum ada momen yang terabadikan." |
| Prompt Moments (Phase 2) | "Apa yang sedang kamu rasakan?" — bukan "Add caption" |
| CTA unduh ZIP | "Simpan Semua Momen" |
| Footer tamu | "Keep it close. Keep it TEMORA." |
| Tombol simpan hasil foto (tamu) | "Simpan ke HP" |
| Setelah simpan/share sukses (tamu) | "Momen sekarang ada di HP-mu ✨" |
| Field link kustom (form event) | Label "Link kustom (opsional)" · helper "Kosongkan untuk otomatis dari nama event." |
| Event berakhir | "Acara ini sudah selesai. Terima kasih sudah jadi bagian dari momennya." |
| Photobooth gagal dimuat | "Momennya belum bisa dibuka. Coba muat ulang sebentar lagi, ya." + CTA "Coba lagi" |
| Consent body (photobooth) | "Foto yang kamu ambil tersimpan ke galeri acara dan hanya bisa dilihat oleh penyelenggara. Foto otomatis terhapus paling lambat 30 hari setelah acara berakhir." |
| Kamera ditolak | "Izin kamera belum aktif. Izinkan akses kamera lewat pengaturan browser-mu, lalu coba lagi ya." |
| Kamera error umum | "Kamera belum bisa diakses. Tutup aplikasi lain yang memakai kamera, lalu coba lagi ya." |
| Rate limit upload | "Semangat sekali! Tunggu sebentar ya, lalu lanjut ambil momen berikutnya." |
| Kuota foto acara penuh | "Kuota momen acara ini sudah penuh. Terima kasih sudah jadi bagian dari momennya!" |
| Tautan meja tidak valid | "Sepertinya tautan ini tidak tepat. Coba scan ulang QR di mejamu, ya." |
| Status upload tertunda (offline/antre) | "Menyimpan…" |
| Kuota event aktif penuh | "Paketmu mengizinkan {n} event aktif. Nonaktifkan salah satu dulu, atau upgrade paketnya ya." |
| Link kustom sudah dipakai | "Link kustom itu sudah dipakai. Coba yang lain, ya." |
| Frame tidak valid | "File harus PNG transparan, ukurannya maksimal 8 MB." |
| Prompt Moments (task 012) | "Apa yang sedang kamu rasakan?" |
| Placeholder input moments | "Tulis momenmu… (opsional)" |
| Button kirim moment | "Simpan Momen" |
| Moment terkirim | "Momenmu tersimpan ✨" |
| Rate limit moment | "Satu momen cukup, biar momen lainnya kebagian. Tunggu sebentar ya." |
| Hidden moment (vendor) | "Moment disembunyikan dari feed" |
| Sponsor consent (task 013) | "Acara ini didukung oleh {nama sponsor}." — ditambahkan di bawah teks consent standar; tidak disebut bila tidak ada sponsor |
| AR tab label | "Efek" · "Tanpa Efek" |
| Green screen tab label | "Latar" |
| AI gagal dimuat (device lemah) | "Efek butuh tenaga lebih. Kamu tetap bisa ambil momen tanpa efek ya." |
| Install prompt PWA — judul | "Simpan TEMORA di layar utama" |
| Install prompt PWA — deskripsi | "Buka cepat, momen tetap dekat. Tanpa perlu unduh aplikasi." |
| Install prompt PWA — CTA | "Install" |
| Install prompt PWA — dismiss | "Nanti Saja" — sembunyikan selama 24 jam sejak dismiss |
| Install prompt PWA — iOS | "Ketuk ikon bagikan lalu pilih 'Tambahkan ke Layar Utama'." |

---

## 7. Iconography & Imagery

**Icons:** Lucide Icons — stroke 1.5px, rounded caps. Size: 16px inline · 20px button · 24px nav. Custom: monogram T untuk watermark/favicon.

**Photography style:** candid, warm, natural light; orang nyata & emosi nyata (bukan stock photo orang kantoran senyum); color grade hangat; shallow DOF untuk kesan intim.

**Illustration:** line-art minimal dengan warm fill, gaya hand-drawn — hanya untuk empty states & onboarding, dipakai hemat.

---

## 8. Brand Assets

| Asset | Spec |
|-------|------|
| Logo (wordmark) | "TEMORA" Cormorant Garamond, tracked +50 — teks di nav/header/footer. Citra kanonik: `public/logos/logo.png` (lockup wordmark + ring-O emas + tagline, 800×457) untuk JSON-LD `Organization.logo`, precache SW, dan sumber generate OG/maskable |
| Monogram | Ring-O emas (huruf O pada lockup `logo.png`) — dipakai sebagai mark kompak bila wordmark penuh tak muat |
| Favicon | `public/favicon.ico` (multi-ukuran, legacy) + `public/icons/favicon-96x96.png` (96×96, tab modern); iOS: `public/icons/apple-touch-icon.png` (180×180) |
| OG Image | `public/og.png` 1200×630 — lockup logo di tengah warm ivory (`bg-base`); generate `node scripts/build-brand-images.mjs`, jangan edit manual |
| Watermark | Free/Basic wajib memakai "Keep it close. Keep it TEMORA." di kanan bawah. Pro dapat mengubah teks/posisi atau memilih tanpa watermark (`watermark_text = NULL`). |
| PWA icons | Lockup wordmark: `public/icons/web-app-manifest-192x192.png`, `web-app-manifest-512x512.png`, `maskable-512.png` (lockup 80% safe zone di atas ivory — generate `node scripts/build-brand-images.mjs`), `apple-touch-icon.png`. `favicon.svg` 3MB peninggalan generator DILARANG dipakai/dikembalikan (boros, nol fungsi di atas `.ico`+PNG) |

---

## 9. Aksesibilitas

- Kontras teks utama vs `bg-base`: ≥ 7:1 (#3D3A36 di #F9F6F1).
- Semua tombol ≥ 44×44px touch target.
- `aria-label` pada semua icon-button.
- Focus ring terlihat: `ring-2 ring-dusty-blue`.
- Kamera ditolak → fallback UI jelas + instruksi izin browser.
- Alt text semua gambar; reduced motion support.

## 10. Loading & Error States

- Skeleton shimmer warna `bg-warm` (bukan spinner default).
- Error state: kalimat human + tombol retry, tanpa stack trace.
- Optimistic UI untuk capture (thumbnail langsung muncul, sync diam-diam).

---

## 11. Anti-Slop Gate (checklist WAJIB sebelum deliver UI)

### Dilarang keras
- [ ] Tanpa gradient biru-ungu klise / gradient text
- [ ] Tanpa glassmorphism tanpa alasan
- [ ] Tanpa neon glow / estetika photobooth ramai
- [ ] Tanpa emoji sebagai icon utama (pakai Lucide)
- [ ] Tanpa badge generik "✨ AI-powered"
- [ ] Tanpa lorem ipsum / stock photo staged
- [ ] Tanpa dark mode default (TEMORA = warm light theme)

### Wajib ada
- [ ] Warna sesuai token §2.1 (tidak ada hardcode hex baru)
- [ ] Microcopy memakai tabel §6
- [ ] Loading states semua async actions
- [ ] Empty states dengan copy hangat
- [ ] Error states gentle + retry
- [ ] Focus states accessibility
- [ ] `min-h-dvh` (bukan `min-h-screen`) untuk mobile
- [ ] Responsive dicek dari viewport 360px ke atas
- [ ] Reduced motion (`prefers-reduced-motion`) didukung

Prinsip akhir: setiap elemen punya alasan ada; whitespace adalah fitur; kalau ragu antara dua pilihan, pilih yang lebih sederhana.

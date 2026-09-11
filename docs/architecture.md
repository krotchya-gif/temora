# Architecture — TEMORA

*Versi: 1.4 · Tanggal: 2026-09-11 · Status: Approved*
*Konsolidasi: arsitektur MVP v1.0 + referensi implementasi AI (Phase 2) + monitoring.*
*Patch 1.3 (2026-08-26): tahap prototipe di-deploy ke Hostinger shared (Git deploy), bukan Vercel — biaya nol selama belum monetisasi. Konsekuensi: build wajib `next build --webpack`, config wajib `next.config.mjs` (bukan `.ts`), cron via pinger eksternal. Terverifikasi running 2026-08-26. Detail §2, §9, §10, §12.*
*Patch 1.5 (2026-09-09): watermark Pro dapat kosong (`NULL`) dan dismiss install prompt ditunda 24 jam. Detail §13.*
*Patch 1.6 (2026-09-10): halaman photobooth membaca event+table via service role dengan 4 status eksplisit (aktif/selesai/tautan-salah/gangguan, §5); base URL QR dinormalisasi tanpa trailing slash (§5); PATCH showcase multipart ganti gambar+judul+kutipan satu aksi (§3.3).*
*Patch 1.7 (2026-09-10): file media ditulis `0644`, folder `0755` — default `0600` tak ter-serve sebagai statis (thumbnail 404 padahal file ada). Detail §11.1, runbook §3, qa-report.*
*Patch 1.8 (2026-09-11): setup studio memperbarui preview kamera secara live; konfigurasi kartu QR event (template, judul, subjudul, tagline) disimpan di `events` dan dipakai halaman print A4. Migration cover, camera setup, QR card, dan watermark diverifikasi di production.*

---

## 1. Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER (Mobile-first)               │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ WebRTC   │ │ Canvas   │ │ IndexedDB│ │ Web Share        │  │
│  │ (Camera) │ │ (Frame + │ │ (retry   │ │ (Simpan/Bagikan) │  │
│  │          │ │  compress)│ │  queue)  │ │                  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘  │
│       └────────────┴────────────┴────────────────┘              │
│                           ↓                                     │
│             ┌──────────────────────────────┐                    │
│             │   Next.js 16 (React SSR)     │                    │
│             │   + Tailwind CSS + Radix UI  │                    │
│             └──────────────┬───────────────┘                    │
└────────────────────────────┼────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────┼────────────────────────────────────┐
│                HOSTING (PROTOTIPE: HOSTINGER SHARED)           │
│                                                                 │
│  ┌─────────────────────────┴────────────────────────────────┐  │
│  │           Next.js API Routes (Node.js 20)                │  │
│  │                                                           │  │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────┐  │  │
│  │  │ /api/   │ │ /api/    │ │ /api/   │ │ /api/        │  │  │
│  │  │ auth    │ │ events   │ │ photos  │ │ billing      │  │  │
│  │  └────┬────┘ └────┬─────┘ └────┬────┘ └──────┬───────┘  │  │
│  │       │           │            │              │           │  │
│  │  ┌────┴────┐ ┌────┴─────┐ ┌───┴────┐ ┌──────┴────────┐  │  │
│  │  │ Supabase│ │ Supabase │ │Supabase│ │ Xendit API    │  │  │
│  │  │ Auth    │ │ PostgREST│ │Storage │ │ (payment)     │  │  │
│  │  └─────────┘ └──────────┘ └────────┘ └───────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              WhatsApp Business Cloud API                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Xendit Webhook                              │  │
│  │          (payment confirmation + tier upgrade)           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Prinsip arsitektur:**
- **Single deploy** — satu codebase Next.js + Supabase, tanpa backend terpisah.
- **AI di client-side** — model berjalan di browser (WASM/WebGL), tanpa biaya GPU.
- **Realtime bila perlu** — Supabase Realtime untuk galeri vendor live-update.
- **Privacy-first** — tidak ada facial recognition; hanya segmentasi & landmark; opt-in consent.

---

## 2. Key Decisions

| Keputusan | Pilihan | Alasan |
|-----------|---------|--------|
| Framework | Next.js 16 (App Router), build via Webpack (`next build --webpack`), config `next.config.mjs` | Full-stack (SSR + API Routes). Turbopack & load config TS butuh SWC native glibc ≥ 2.29 — tidak tersedia di builder Hostinger shared; fallback WASM gagal di tahap kompilasi config (vercel/next.js#96960). `.mjs` = tanpa transpile config |
| UI | Tailwind CSS 4 + Radix UI + Lucide Icons | Komponen accessible, konsisten, cepat |
| Database | Supabase (PostgreSQL 15) | SQL relasional cocok, RLS built-in, free tier generous |
| Auth | Supabase Auth | Email/password, terintegrasi langsung dengan DB & RLS |
| Storage | Hostinger media subdomain | File upload persisten di `media.temora.site`; Supabase hanya Database/Auth/Realtime |
| Hosting | Hostinger shared — Git deploy (tahap prototipe) | Biaya nol tambahan selama MVP belum monetisasi; re-evaluasi Vercel/VPS sebelum launch gate (task 015–017) |
| Payment | Xendit | Invoice + payment link + webhook, populer di Indonesia |
| WhatsApp | WhatsApp Business Cloud API | Notifikasi ke vendor + deep-link aktivasi |
| QR Code | `qrcode` (npm) | Ringan, generate SVG/PNG server-side |
| ZIP Download | `jszip` (npm) | Server-side streaming untuk volume besar |
| Camera | WebRTC `getUserMedia` | Universal, tanpa install, mobile-first |
| Charts (task 014) | — (grid CSS + agregat SQL) | Visualisasi ringan tanpa dependency — heatmap/bar dari div + token |
| AI (task 011) | MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) | ImageSegmenter (green screen) — client-side, lazy-load |
| CI/CD | GitHub Actions | Lint + typecheck otomatis tiap push |
| PWA | Manifest via `src/app/manifest.ts` + service worker statis `public/sw.js` (tanpa next-pwa/serwist) | Hostinger shared + build Webpack = hindari integrasi SW ke pipeline build; file statis di `public/` ikut Git deploy tanpa konfigurasi tambahan. Offline scope: shell + aset statis + LUT; API/auth tetap network-only |

### Why Supabase, not Firebase?

| Aspek | Supabase | Firebase |
|-------|----------|----------|
| Database | PostgreSQL (SQL, relasional) | Firestore (NoSQL, document) |
| Auth | Supabase Auth + RLS policies | Firebase Auth + Security Rules |
| Query | SQL langsung / PostgREST | Firestore SDK (limited queries) |
| Realtime | Realtime subscriptions | Firestore realtime listeners |
| Pricing | 500MB DB + 1GB storage (free) | 1GB DB + 5GB storage (free) |
| Vendor lock-in | Lower (open source) | Higher (proprietary SDK) |

**Verdict**: Supabase lebih cocok karena data TEMORA relasional (vendor → event → table → photo), SQL lebih powerful untuk analytics, dan open-source.

### Supabase Clients (konvensi wajib)

| File | Key | Dipakai untuk |
|------|-----|---------------|
| `src/lib/supabase/client.ts` | Anon | Browser — read event/table publik, Realtime subscribe galeri |
| `src/lib/supabase/server.ts` | Anon + cookie session | Server Components, middleware, API routes **vendor** (auth.uid() via RLS) |
| `src/lib/supabase/admin.ts` | Service role | API routes tamu (upload/saved/scan), cron, webhook, bypass RLS — **never client** |

> Jangan campur service role ke `server.ts`. Vendor auth wajib cookie session agar RLS `auth.uid()` jalan.

---

## 3. Pages & Routes

### 3.0 Struktur Folder

```
src/
├── app/                    # App Router — routes di tabel §3.1–3.3
│   ├── (auth)/             # login, signup (task 003)
│   ├── (legal)/            # privacy, terms (task 015)
│   ├── dashboard/          # vendor area (task 003+)
│   ├── p/[eventId]/[tableId]/  # photobooth tamu (task 004)
│   ├── print/[eventId]/qr/   # cetak QR (task 005)
│   ├── api/                # API routes §3.3
│   ├── globals.css         # @theme tokens (design-system §2.5)
│   └── layout.tsx          # root layout + fonts
├── components/
│   ├── photobooth/         # CameraStage, ConsentScreen, GradeCanvas, dst
│   ├── gallery/            # PhotoGrid, Lightbox
│   ├── dashboard/          # komponen halaman internal
│   └── ui/                 # Button, Input, Card dasar (Radix + tokens)
├── lib/
│   ├── supabase/           # client.ts · server.ts · admin.ts (§2)
│   ├── ai/                 # segmentation.ts, lut.ts (Phase 2)
│   ├── xendit.ts · whatsapp.ts · validation/
└── proxy.ts                # proteksi /dashboard/* (task 003; konvensi Next 16, ex-middleware.ts)

supabase/
├── config.toml             # init task 001; migrasi task 002
├── migrations/             # SQL via CLI (task 002+)
└── seed.sql                # dummy dev (task 002)
```

### 3.1 Public Pages

| Route | Deskripsi | Auth |
|-------|-----------|------|
| `/` | Landing page TEMORA | No |
| `/p/[eventId]/[tableId]` | Photobooth page (tamu); `[eventId]` = UUID atau slug kustom | No (QR gate) |
| `/login` | Login vendor | No |
| `/signup` | Register vendor | No |
| `/how-it-works` | How it works | No |
| `/moments` | Galeri publik foto kurasi platform + lightbox | No |
| (landing `/`) | Section tali momen interaktif — 24 showcase terbaru | No |
| `/pricing` | Pricing tiers | No |
| `/faq` | Pertanyaan umum (accordion `<details>`) | No |
| `/privacy` | Kebijakan privasi (statis) | No |
| `/terms` | Syarat & ketentuan (statis) | No |
| `/print/[eventId]/qr` | Print kartu meja A4 (owner session) | Yes |
| `/print/[eventId]/moments` | Print laporan momen A4 (owner session, task 012) | Yes |

### 3.2 Dashboard Pages (Vendor)

| Route | Deskripsi | Auth |
|-------|-----------|------|
| `/dashboard` | Overview (events, foto, storage) | Yes |
| `/dashboard/events` | List semua event | Yes |
| `/dashboard/events/new` | Buat event baru | Yes |
| `/dashboard/events/[eventId]` | Detail event | Yes |
| `/dashboard/events/[eventId]/edit` | Workspace setup event: cover/frame, tampilan kamera/filter live preview, watermark, dan copy/template QR | Yes |
| `/dashboard/events/[eventId]/cover` | Editor cover visual: template, foto, judul, subjudul, tombol | Yes |
| `/dashboard/events/[eventId]/gallery` | Galeri foto + download ZIP | Yes |
| `/dashboard/events/[eventId]/moments` | Feed moments real-time + moderasi (task 012) | Yes |
| `/dashboard/events/[eventId]/sponsors` | Kelola logo sponsor (task 013, Pro) | Yes |
| `/dashboard/events/[eventId]/analytics` | Analytics agregat + heatmap (task 014) | Yes |
| `/dashboard/events/[eventId]/qr` | Generate + cetak QR meja; styling/copy QR diatur dari workspace event | Yes |
| `/dashboard/settings` | Profil, WA opt-in, subscription | Yes |
| `/dashboard/billing` | Invoice, pembayaran, history | Yes |

> **Halaman superadmin** (`/admin/*`, task 018): role via `auth.users.app_metadata.role='superadmin'` (runbook §6), guard 3 lapis proxy→layout→route, query lintas-vendor lewat service-role client tanpa policy RLS baru.
>
> | Route | Deskripsi |
> |---|---|
> | `/admin` | Statistik global platform (subs/WA/audit/storage) |
> | `/admin/vendors` | Daftar vendor + kelola tier + pagination/search |
> | `/admin/vendors/[vendorId]` | Detail vendor: edit profil, ban/unban, hapus permanen, subscription, WA health, audit |
> | `/admin/events` | Semua event + moderasi status |
> | `/admin/events/[eventId]` | Detail event + moderasi foto |
> | `/admin/showcase` | Kurasi foto Moments: upload/edit/hapus/urutkan |
> | `/admin/settings` | Pengaturan platform (URL sosial media footer) |
> | `/admin/seo` | Hub SEO & analytics 5 tab (meta/robots/sitemap/tracking/event/UTM) — detail `docs/research/seo-admin-reference.md` |
> | `/admin/audit` | Feed jejak audit admin (terpaginasi) |
>
> Prinsip peran terpisah (task 019): superadmin **tidak** bisa membuka
> `/dashboard` (redirect ke `/admin`); 1 akun = 1 peran.

### 3.3 API Routes

| Endpoint | Method | Fungsi | Auth |
|----------|--------|--------|------|
| `/api/auth/login` | POST | Login vendor | No |
| `/api/auth/signup` | POST | Register vendor | No |
| `/api/auth/logout` | POST | Logout | Yes |
| `/api/events` | GET | List event vendor | Yes |
| `/api/events` | POST | Buat event baru | Yes |
| `/api/events/[eventId]` | GET/PUT/DELETE | Detail/update/hapus event | Yes |
| `/api/events/[eventId]/tables` | POST | Generate tabel + QR | Yes |
| `/api/events/[eventId]/photos` | GET | List foto (paginated) | Yes |
| `/api/events/[eventId]/photos/upload` | POST | Upload foto tamu (service role, rate-limited, dedup `client_upload_id`) | No (event+table validated) |
| `/api/events/[eventId]/photos/[photoId]/saved` | POST | Set `guest_saved_at` (validasi `capture_token`) | No |
| `/api/events/[eventId]/tables/[tableId]/scan` | POST | Increment `scan_count` (max 1× per sesi via sessionStorage guard client) | No |
| `/api/events/[eventId]/photos/zip` | POST | Generate ZIP download | Yes |
| `/api/events/[eventId]/photos/[photoId]` | DELETE | Hapus foto | Yes |
| `/api/events/[eventId]/frame` | POST | Upload frame kustom (multipart PNG) | Yes |
| `/api/events/[eventId]/moments` | GET | List moments (vendor, hidden filter) | Yes |
| `/api/events/[eventId]/moments` | POST | Kirim moment (caption ± foto; rate-limit 60 dtk) | No (event+table validated) |
| `/api/events/[eventId]/moments/[momentId]` | PATCH | Hide/show moment (moderasi vendor) | Yes |
| `/api/events/[eventId]/sponsors` | GET | List sponsor aktif (consent/QR card) | No |
| `/api/events/[eventId]/sponsors` | POST | Tambah sponsor + logo (Pro only) | Yes (tier check) |
| `/api/events/[eventId]/sponsors/[sponsorId]` | PATCH/DELETE | Edit/hapus/deactivate sponsor | Yes (tier check) |
| `/api/settings/wa` | PUT | Nomor WhatsApp + opt-in notifikasi | Yes |
| `/api/health` | GET | Health check (probe CI/UptimeRobot) | No |
| `/api/events/[eventId]/photos/[photoId]` | GET | Signed URL resolusi penuh (lightbox) | Yes |
| `/api/events/[eventId]/photos/zip` | GET | Polling progres job ZIP (`?job=`) | Yes |
| `/api/whatsapp/webhook` | GET | Handshake verifikasi Meta (`hub.verify_token`) | Verify token |
| `/api/events/[eventId]/qr/[tableId]` | GET | Get QR code SVG/PNG | No |
| `/api/billing/checkout` | POST | Create Xendit invoice | Yes |
| `/api/billing/webhook` | POST | Xendit webhook handler | No (callback token verified) |
| `/api/whatsapp/webhook` | POST | Delivery status WA | Signature verified |
| `/api/admin/vendors/[vendorId]/tier` | PUT | Set tier vendor | Superadmin (404 mask) |
| `/api/admin/vendors/[vendorId]` | PATCH | Edit profil vendor (email tersinkron Admin API) | Superadmin (404 mask) |
| `/api/admin/vendors/[vendorId]/ban` | POST | Ban/unban vendor (+nonaktif semua event saat ban) | Superadmin (404 mask) |
| `/api/admin/vendors/[vendorId]` | DELETE | Hapus permanen (purge storage → cascade → auth user; confirmEmail wajib) | Superadmin (404 mask) |
| `/api/admin/events/[eventId]/status` | PATCH | Set is_active event | Superadmin (404 mask) |
| `/api/admin/events/[eventId]/photos/[photoId]` | DELETE | Soft delete foto (moderasi) | Superadmin (404 mask) |
| `/api/admin/showcase` | POST | Tambah foto kurasi Moments (multipart) | Superadmin (404 mask) |
| `/api/admin/showcase/[photoId]` | PATCH/DELETE | Edit gambar/judul/kutipan (PATCH JSON atau multipart) / hapus; replace gambar memakai path baru lalu purge file lama | Superadmin (404 mask) |
| `/api/admin/showcase/reorder` | POST | Ubah urutan kartu showcase (naik/turun) | Superadmin (404 mask) |
| `/api/admin/settings` | PATCH | Simpan platform_settings (KV whitelist, validasi per-key) | Superadmin (404 mask) |
| `/api/admin/secrets` | PUT | Simpan rahasia (service account GA4/GSC) — nilai tidak pernah dikembalikan | Superadmin (404 mask) |
| `/api/admin/analytics/stats` | GET | Angka GA4 + GSC real; provider independen, cache sukses 5 mnt; 200 sukses / 207 parsial / 502 gagal | Superadmin (404 mask) |
| `/api/admin/events` | GET | 100 event konversi marketing terakhir | Superadmin (404 mask) |
| `/api/admin/events/[eventId]/retry` | POST | Tandai event terkirim (retry manual) | Superadmin (404 mask) |
| `/api/admin/utm/report` | GET | Laporan kunjungan + konversi per source kampanye | Superadmin (404 mask) |

---

## 4. Data Flow

### 4.1 Tamu Ambil Foto
```
1. Tamu scan QR → browser buka /p/[eventId]/[tableId]
2. Client generate client_upload_id (UUID) per capture — dipakai ulang saat retry offline
3. Consent screen privasi → "Oke, Mengerti"
4. POST /api/events/[eventId]/tables/[tableId]/scan → increment scan_count (1× per sesi)
5. WebRTC: minta izin kamera → getUserMedia({ video: true, facingMode: 'user' })
6. Canvas: tampilkan frame overlay (PNG transparan dari events.frame_url),
   preset kamera dan filter LUT dari konfigurasi event (`camera_preset`,
   `filter_id`, `filter_strength`). Guest tidak dapat mengubah preset/filter;
   setup vendor adalah sumber tampilan kamera dan hasil foto.
7. Tamu tap "Ambil Momen"
8. Canvas → JPEG adaptif (mulai quality 0.86, minimum normal 0.72); bila masih
   >800KB, resolusi diturunkan bertahap sebelum quality diturunkan lebih jauh.
   Target delivery tetap <800KB dengan sisi panjang minimum 960px untuk foto
   tamu yang normal.
9. POST /api/events/[eventId]/photos/upload (FormData: image + tableId + client_upload_id)
10. Server (service role): validasi event aktif + limit + table_id milik event
    → dedup by client_upload_id (return existing jika sudah ada)
    → upload Storage → insert row photos + thumb
    → response: photo id + capture_token
11. Client: preview → optimistic thumbnail → toast "Momen tersimpan ✨"
12. Opsi "Simpan ke HP"/bagikan (Web Share API)
    → POST /api/events/[eventId]/photos/[photoId]/saved { capture_token } → set guest_saved_at
```

**Upload resilience:** fetch gagal → simpan blob + client_upload_id ke IndexedDB → auto-retry saat `online` (idempotency via client_upload_id).

> Jalur upload **selalu** lewat API route (service role). Client **tidak** insert langsung ke Storage/DB via anon key.

### 4.2 Vendor Download ZIP
```
1. Vendor klik "Simpan Semua Momen" di gallery
2. POST /api/events/[eventId]/photos/zip
3. Server: query semua foto → download dari Storage → JSZip stream
4. Upload ZIP ke bucket 'zips'
5. Return signed URL (15 menit expiry)
6. Client: trigger download
```
> 100 foto → sinkron; >100 foto → background job + polling status (lihat task 006).

### 4.3 Pembayaran Xendit
```
1. Vendor klik "Upgrade" di /dashboard/billing
2. POST /api/billing/checkout { tier } → create Xendit invoice
3. Redirect ke payment page Xendit
4. Vendor bayar → Xendit fire webhook ke /api/billing/webhook
5. Server: verify callback token (idempotent by xendit_invoice_id)
6. Update subscriptions.paid + vendors.subscription_tier
7. Kirim WhatsApp "Pembayaran berhasil, tier Pro aktif 🎉"
```

### 4.4 WhatsApp Notification Flow
```
Trigger (event_created | photo_milestone | invoice | payment_ok | expiry_reminder)
→ enqueueWa(vendorId, kind, payload) → insert whatsapp_logs (queued)
→ send async via WhatsApp Business Cloud API
→ log status sent/failed; retry 1x; quiet hours 22:00–07:00 WIB
```

---

## 5. Authentication Flow

### Vendor Auth
```
1. Signup → POST /api/auth/signup (email, password, name) — server client (cookie session)
2. Supabase Auth: create user → trigger handle_new_vendor() → row vendors
3. Login → session JWT → httpOnly cookie (@supabase/ssr via server.ts)
4. Middleware: validate session di setiap /dashboard/* route
```

### Guest Auth (No Login)
```
1. Scan QR → /p/[eventId]/[tableId]
2. Server page membaca event + table via service role, lalu memeriksa `is_active`
   dan `expires_at` secara eksplisit. Row tidak ada → tautan tidak valid; event
   nonaktif/expired → layar selesai; kegagalan query → layar gangguan + retry.
   Data yang diteruskan ke client tetap hanya field publik photobooth.
3. Upload foto via POST /api/.../photos/upload (server pakai service role — bukan insert anon langsung)
4. Tamu TIDAK bisa SELECT foto — galeri hanya milik vendor
5. Tamu bisa POST saved/scan endpoints (token/session validated di server)
```

### Tier & Limit Enforcement
Detail aturan terkunci: `docs/database.md` §2.7. Ringkas:
- `photo_limit` diset saat create event (Free=100, Basic=500, Pro=NULL).
- Free: max 1 event **aktif**, unlimited nonaktif.
- Downgrade: event aktif tetap jalan; block create/activate baru sampai ≤1 aktif.
- `ends_at` informasi saja — tidak memblokir tamu.
- Base URL QR dinormalisasi tanpa trailing slash sebelum path `/p/...` ditambahkan.

---

## 6. Security

| Area | Implementasi |
|------|-------------|
| **Auth** | Supabase Auth + httpOnly cookies + JWT (@supabase/ssr) |
| **API** | Middleware auth di `/dashboard/*` + API routes vendor (`/api/events`, `/api/billing/checkout`, dll). Route publik (upload, webhook, QR, saved, scan) dikecualikan |
| **Database** | RLS — vendor hanya akses data sendiri; tamu tak bisa baca foto (detail database.md §4) |
| **Defense in depth** | Validasi limit/tier + table_id ownership + client_upload_id dedup di API route; RLS anon INSERT sebagai guard cadangan |
| **Rate limit** | ±12 foto/menit per meja (+ fallback per IP) di upload route |
| **Payment** | Xendit callback token verification + idempotent handler |
| **WhatsApp** | Tidak kirim data sensitif; throttle & quiet hours |
| **Photos** | Watermark otomatis saat capture |
| **Data at rest/in transit** | AES-256 default Supabase + HTTPS via SSL hPanel (auto Let's Encrypt) |
| **Guest privacy** | Consent screen, TTL auto-delete (30 hari), tanpa facial recognition |
| **Input** | Sanitize string user-generated; zod validation di semua form/API |
| **HTTP headers** | Diset via `next.config.mjs` `headers()` (2026-08-28): CSP `upgrade-insecure-requests; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera=(self) — dibutuhkan photobooth), HSTS max-age 31536000; `poweredByHeader: false` menghapus `x-powered-by: Next.js`. Batasan hosting: `server: hcdn` + `platform: hostinger` + `panel: hpanel` disuntik Hostinger CDN — tidak bisa dihapus dari aplikasi (Opsional: hPanel → header CDN bila ingin diatur level CDN) |

---

## 7. Scalability

| Fase | Target | Strategi |
|------|--------|----------|
| MVP | 10 vendor, 20 event, 2.000 foto | Supabase free tier |
| Growth | 75 vendor, 400 event, 60.000 foto | Supabase Pro ($25/mo) |
| Scale | 300+ vendor | Supabase Team + read replicas + edge caching |

**Bottleneck & solusi:**
- Spike upload → client-side compression + IndexedDB queue
- ZIP generation berat → background job + polling (bukan blok request)
- Storage free tier 1GB → monitor pemakaian; ≥ 80% (~800MB) langsung upgrade Supabase Pro $25/bln (checklist task 015 + runbook)
- CDN → static assets + frame PNG diserve langsung hosting (upgrade ke CDN/Vercel Edge saat launch)

---

## 8. AI Implementation Reference (Phase 2 Prep)

> Bagian ini adalah **referensi implementasi aktif** (task 011, dikerjakan
> 2026-08-28). Semua model jalan client-side, lazy-load, dan wajib punya fallback
> graceful. Detail task: `tasks/010-ar-filters.md`, `tasks/011-green-screen.md`.
>
> ⚠️ Catatan versi: snippet memakai pola **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision`) — penerus legacy `@mediapipe/selfie_segmentation` & `@mediapipe/pose` yang sudah deprecated. Verifikasi API terkini saat implementasi.

### 8.1 Person Segmentation (Green Screen)
```typescript
// src/lib/ai/segmentation.ts — lazy-load, dipanggil hanya saat fitur aktif
import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

export async function createSegmenter() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  );
  return ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
      delegate: 'GPU', // fallback CPU otomatis jika tak didukung
    },
    runningMode: 'VIDEO',
    outputCategoryMask: true,
    outputConfidenceMasks: true, // person = 1 - confidenceMasks[0] (bg)
  });
}

// compositing: paintBackground dulu → potong subjek (source-in mask) →
// gambar subjek DI ATAS latar. Soft edge: ramp alpha 0.3–0.7 dari
// "person-ness" (1 - bgConf) — bukan ctx.filter (Safari iOS tidak dukung).

// PENTING (2026-08-28, revisi §6l–§6n): MPMask.getAsUint8Array() adalah
// SINGLE-channel (1 nilai/pixel 0–255 = kelas*255), BUKAN RGBA — lihat
// tasks/web/vision/core/mask.ts. categoryMask pada build ini berperilaku
// seperti channel background → person dihitung sebagai BUKAN background:
// `outputConfidenceMasks: true` + confidenceMasks[0] → person = 1 - bgConf,
// soft edge ramp 0.3–0.7 (komposit: person = NOT background, §6n).
```

### 8.2 Face Landmark (AR Props)

AR props dihapus dari scope produk pada 2026-09-09. Tidak ada model face
landmark atau asset props yang dimuat oleh aplikasi.

### 8.3 Aturan Performa AI
- Lazy-load: model hanya dimuat setelah tamu aktifkan fitur (dynamic import).
- Target ≥ 25 FPS HP mid-range di atas 20 FPS hard-minimum; di bawah itu → matikan AR otomatis.
- Bundle utama photobooth dasar **tidak boleh** terpengaruh ukuran model (chunk terpisah).
- Fallback: segmentasi gagal/gelap → tawarkan mode tanpa efek, jangan blok capture.

### 8.4 Color Filter (3D LUT, WebGL) — 2026-08-28
- Aset: tujuh file `.cube` kurasi di `public/luts/`; daftar dan intensitas
  mengikuti design-system §3.9, kredit di research/lut-credits.md.
- Kenapa WebGL bukan `ctx.filter`: `CanvasRenderingContext2D.filter` **tidak
  didukung Safari iOS** → pakai HALD atlas (grid = ceil(sqrt(size)), 52×52 utk 13)
  + shader trilinear lookup (`src/lib/ai/lut.ts`).
- Pipeline preview == hasil: `GradeCanvas` me-render sumber (video / kanvas green
  screen) → buffer 2D → WebGL LUT → output canvas; saat filter aktif, canvas ini
  menjadi **sumber capture** (frame/watermark digambar setelahnya supaya
  tidak ikut di-grade, konsisten dengan preview DOM overlay).
- Tab "Filter" (label design-system §6) lazy-load `.cube` saat dipilih; gagal
  (jaringan/WebGL mati) → fitur nonaktif tanpa crash.
- Catatan (2026-08-28, §6m): uniform `uSize`/`uGrid` **wajib** di-set via
  `uniform1f` di `setLut()` — default 0 membuat lookup negatif → output gelap.
- Catatan (§6n): upload source canvas wajib `UNPACK_FLIP_Y_WEBGL=true`
  (pola MediaPipe `gpuOriginForWebTexturesIsBottomLeft`) — tanpa itu gambar
  tampil terbalik (kepala ke bawah).
- Catatan (§6o): `UNPACK_FLIP_Y_WEBGL` adalah state global konteks — **wajib
  di-scope**: set `true` hanya saat upload source DOM lalu reset `false`;
  `setLut()` eksplisit `false` sebelum upload atlas. Bocor ke upload atlas →
  warna LUT kacau (sumbu hijau terbalik).
- Daftar filter **manifest-driven** (§6p): `public/luts/manifest.json`
  (generate `node scripts/sync-luts.mjs`) → `getLuts()` runtime, fallback
  `FALLBACK_LUTS`. `loadLut` memakai `encodeURIComponent` (nama file bisa
  berisi spasi/uppercase `.CUBE`). Kanvas grade/LUT dirender **sebelum** overlay
  frame di DOM (z-order — frame wajib di atas kanvas).
- Koreksi 2026-09-09: semua aset `.cube` memakai indeks `(b·S+g)·S+r`
  (red fastest), termasuk ekspor Photoshop. Asumsi §6q lama keliru.
  Parser membaca per baris, membuang komentar sebelum angka, memvalidasi
  jumlah titik tepat dan domain 0–1, serta menolak LUT 1D/domain lain.
  Nilai atlas diklem ke 0–1 sebelum konversi byte; upload RGB memakai
  `UNPACK_ALIGNMENT=1`. Katalog kurasi di `src/lib/ai/lut-catalog.json`
  menghasilkan manifest publik dan menjadi fallback yang sama. Default
  intensitas per look mengikuti design-system §3.9. Slider tidak memulai
  ulang render loop; capture hanya aktif sesudah frame look terpilih siap.
- Fitur yang di-OFF sementara via `src/lib/ai/feature-flags.ts` (§6o):
  `ENABLE_BACKGROUNDS=false` — green screen masih tersedia di kode untuk uji
  ulang.

---

## 9. Monitoring & Alerting

| Layer | Tool | Cakupan |
|---|---|---|
| Error tracking | Log Node app di hPanel (Hostinger) | Request, error, deployment |
| Logs | Supabase Logs | Query lambat, auth events |
| Uptime | UptimeRobot | Ping `temora.site` tiap 5 menit |
| Performance | — (nonaktif sementara) | Vercel Analytics no-op di luar Vercel; aktifkan alternatif (mis. Web Vitals) saat upgrade hosting menjelang launch |
| Billing alerts | Xendit Dashboard + cron reconciliation harian | Webhook gagal / invoice pending > 24 jam |

---

## 10. Tech Stack Reference

```
Frontend:   Next.js 16, React 19, Tailwind CSS 4, Radix UI, Lucide Icons
Font:       Cormorant Garamond (display) · Plus Jakarta Sans (body) · JetBrains Mono (data)
Backend:    Next.js API Routes (Node.js 20+)
Database:   Supabase (PostgreSQL 15)
Auth:       Supabase Auth (email/password)
Storage:    Hostinger media subdomain (media.temora.site)
Hosting:    Hostinger shared, Git deploy (prototipe; build --webpack)
Payment:    Xendit (invoice, payment link, webhook)
WhatsApp:   WhatsApp Business Cloud API
Libraries:  qrcode, jszip, sharp, zod, @supabase/ssr
Phase 2:    @mediapipe/tasks-vision (segmentation) — task 011 tersedia, OFF sementara
CI/CD:      GitHub Actions (lint/typecheck/build/test) + Hostinger Git auto-deploy; Playwright mencakup viewport admin 360px dan desktop
Monitoring: UptimeRobot · cron-job.org (pinger cron) · log Node app hPanel
```

---

## 11. Environment Variables

SSOT daftar env — commit `.env.example` (tanpa nilai asli), runtime pakai `.env.local` (gitignored).

| Variable | Scope | Task | Keterangan |
|----------|-------|------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | 001 | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | 001 | Anon key (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | 001 | Service role — `admin.ts` saja |
| `NEXT_PUBLIC_APP_URL` | client | 001 | Base URL app (`http://localhost:3000` dev, `https://temora.site` prod) — QR & redirect & metadataBase. **Produksi wajib `https://`** (og:image dsb. ditolak scraper bila http) |
| `XENDIT_SECRET_KEY` | server | 008 | API key Xendit |
| `XENDIT_WEBHOOK_TOKEN` | server | 008 | Verifikasi callback webhook |
| `XENDIT_API_BASE` | server | 008 | Base URL API Xendit (default `https://api.xendit.co`) — override untuk sandbox |
| `WHATSAPP_TOKEN` | server | 009 | Meta Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | server | 009 | ID nomor WA Business |
| `WHATSAPP_VERIFY_TOKEN` | server | 009 | Verifikasi handshake webhook Meta |
| `WHATSAPP_APP_SECRET` | server | 009 | App Secret Meta — verifikasi header `x-hub-signature-256` webhook |
| `WA_GRAPH_BASE` | server | 009 | Base URL Graph API Meta (default `https://graph.facebook.com`) |
| `NEXT_PUBLIC_WA_ADMIN_NUMBER` | client | 009/017 | Nomor admin aktivasi (format 62…, tanpa +) |
| `CRON_SECRET` | server | 015 | Bearer token proteksi route `/api/cron/*` (dipanggil pinger eksternal) |
| `HOSTINGER_MEDIA_URL` | server + public URL builder | storage | Base URL media service (`https://media.temora.site`) |
| `NEXT_PUBLIC_HOSTINGER_MEDIA_URL` | client + server | storage | Public media base URL untuk thumbnail/frame/logo/showcase |
| `HOSTINGER_UPLOAD_URL` | server only | storage | Endpoint PHP upload media service |
| `HOSTINGER_STORAGE_SECRET` | server only | storage | Shared secret Next.js ↔ media service |

Secret **tidak pernah** di-commit. Preview & production pakai nilai berbeda (task 015 §4.1).

### 11.1 Media storage Hostinger

Upload baru dikirim server-to-server dari API Next.js ke `media.temora.site`.
Subdomain memiliki document root terpisah dari project Git deploy utama agar
file tetap persisten saat aplikasi diperbarui. Area `public` berisi frame,
thumbnail, sponsor, dan showcase; area `private` berisi foto resolusi penuh dan
ZIP. File private hanya dibaca melalui API Next.js setelah ownership check.
Handler PHP memverifikasi `HOSTINGER_STORAGE_SECRET`, whitelist area, path aman,
MIME/magic bytes, dan batas ukuran. File ditulis `0644` dan folder `0755`
(patch 1.7 — default `0600` tak terbaca static handler). File development lama
di Supabase Storage tidak dimigrasikan.

---

## 12. Cron Jobs (Pinger Eksternal — Tahap Prototipe)

Hosting prototipe (Hostinger shared) tidak menyediakan scheduler HTTP bawaan. Semua job dijadwalkan via **pinger eksternal gratis** (cron-job.org / UptimeRobot) yang memanggil endpoint dengan header `Authorization: Bearer ${CRON_SECRET}`.

| Path | Schedule | Task | Fungsi |
|------|----------|------|--------|
| `/api/cron/photo-ttl` | `0 2 * * *` | 006 | Hapus foto event yang `expires_at` lewat |
| `/api/cron/subscription-expiry` | `0 3 * * *` | 008 | Turunkan tier + tandai subscription expired |
| `/api/cron/wa-queue` | `*/5 * * * *` | 009 | Retry pesan WA status `queued` |
| `/api/cron/wa-reminders` | `0 8 * * *` | 008/009 | Reminder H-3/H-0 sebelum `period_end` |

Semua cron route: verifikasi header `Authorization: Bearer ${CRON_SECRET}`.

> Saat upgrade hosting menjelang launch (task 015), pindahkan kembali ke scheduler native (Vercel Cron / systemd timer) dan hapus pinger eksternal.

---

## 13. Progressive Web App (PWA)

*Patch 1.4 (2026-08-31). Keputusan: manifest + service worker statis, tanpa dependensi build (next-pwa/serwist) — kompatibel dengan Hostinger shared + `next build --webpack`.*

### 13.1 Komponen

| Bagian | Lokasi | Keterangan |
|--------|--------|------------|
| Web App Manifest | `src/app/manifest.ts` | Route handler Next → `/manifest.webmanifest`. Name, icons 192/512, `display: standalone`, `theme_color` = token `--color-bg-base` (#F9F6F1) |
| Icon set | `public/favicon.ico`, `public/icons/favicon-96x96.png`, `apple-touch-icon.png`, `web-app-manifest-192x192.png`, `web-app-manifest-512x512.png`, `maskable-512.png` (lockup wordmark + ring-O; maskable & `public/og.png` 1200×630 di-generate `node scripts/build-brand-images.mjs` dari `public/logos/logo.png` — encoder/decode PNG murni Node/zlib, tanpa dependency) — sesuai design-system §8 |
| Service Worker | `public/sw.js` | Statis di `public/` → ikut Git deploy; **tanpa** integrasi Next build. Versi cache via konstanta `CACHE_VERSION`; update = bump versi |
| Install Prompt | `src/components/PwaInstallPrompt.tsx` | Client component di root layout. Kalau user dismiss, waktu disimpan di localStorage (`temora_pwa_dismissed`) dan prompt boleh muncul lagi setelah 24 jam. Sembunyi di halaman photobooth (`/p/`) |

### 13.2 Strategi Caching (`public/sw.js`)

- **Precache** saat `install`: `/`, `/manifest.webmanifest`, icon set, wordmark.
- **Cache-first**: `/_next/static/` (JS/CSS/font hashed build), `/icons/`, `/logos/`, `/luts/` (manifest + file .cube — stale-while-revalidate).
- **Network-first + fallback cache**: navigasi halaman (offline → shell HTML cache terakhir).
- **Network-only**: semua `POST` (upload foto/moment), `/api/*`, dan request ke Supabase (auth/RLS wajib online).
- `skipWaiting` + `clients.claim` saat `activate`; cache lama dibersihkan saat versi berubah.

### 13.3 Install Prompt Behavior

- Listen `beforeinstallprompt` (Chromium) — prompt browser asli, bukan UI tiruan.
- **Dismiss** ("Nanti Saja") → simpan timestamp di `localStorage` → prompt disembunyikan selama 24 jam sejak dismiss, lalu boleh muncul lagi pada kunjungan berikutnya. Reset manual: hapus key localStorage.
- `appinstalled` → sembunyikan prompt.
- iOS (Safari, tanpa `beforeinstallprompt`): tampil instruksi "Tambahkan ke Layar Utama" (mobile-first — tamu banyak di iOS).
- Tidak muncul di halaman photobooth `/p/*` (immersive full-screen) dan bila sudah `display-mode: standalone`.

### 13.4 Batasan Offline (wajib dicatat)

- PWA **tidak** membuat photobooth bisa jalan offline: kamera, Supabase auth, dan upload tetap butuh koneksi.
- Nilai PWA: install ke home screen (ikon + standalone), shell & aset statis & LUT termuat cepat dari cache, navigasi halaman publik tetap tampil saat jaringan hilang.
- Upload offline yang sudah ada (antrean IndexedDB, qa-report §6c) **tidak** berubah — SW tidak meng-cache request upload.

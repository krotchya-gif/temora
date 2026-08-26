# Architecture — TEMORA

*Versi: 1.3 · Tanggal: 2026-08-26 · Status: Approved*
*Konsolidasi: arsitektur MVP v1.0 + referensi implementasi AI (Phase 2) + monitoring.*
*Patch 1.3 (2026-08-26): tahap prototipe di-deploy ke Hostinger shared (Git deploy), bukan Vercel — biaya nol selama belum monetisasi. Konsekuensi: build wajib `next build --webpack`, config wajib `next.config.mjs` (bukan `.ts`), cron via pinger eksternal. Terverifikasi running 2026-08-26. Detail §2, §9, §10, §12.*

---

## 1. Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER (Mobile-first)               │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ WebRTC   │ │ Canvas   │ │ QR Code  │ │ Google Translate  │  │
│  │ (Camera) │ │ (Frame)  │ │ (Scan)   │ │ (Widget)          │  │
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
| Storage | Supabase Storage | Foto, frame, ZIP — terintegrasi dengan RLS |
| Hosting | Hostinger shared — Git deploy (tahap prototipe) | Biaya nol tambahan selama MVP belum monetisasi; re-evaluasi Vercel/VPS sebelum launch gate (task 015–017) |
| Payment | Xendit | Invoice + payment link + webhook, populer di Indonesia |
| WhatsApp | WhatsApp Business Cloud API | Notifikasi ke vendor + deep-link aktivasi |
| QR Code | `qrcode` (npm) | Ringan, generate SVG/PNG server-side |
| ZIP Download | `jszip` (npm) | Server-side streaming untuk volume besar |
| Camera | WebRTC `getUserMedia` | Universal, tanpa install, mobile-first |
| Charts (Phase 3) | Chart.js | Ringan, cukup untuk agregat analytics dashboard |
| CI/CD | GitHub Actions | Lint + typecheck otomatis tiap push |

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
│   ├── photobooth/         # CameraStage, ConsentScreen, PropOverlay, dst
│   ├── gallery/            # PhotoGrid, Lightbox
│   ├── dashboard/          # komponen halaman internal
│   └── ui/                 # Button, Input, Card dasar (Radix + tokens)
├── lib/
│   ├── supabase/           # client.ts · server.ts · admin.ts (§2)
│   ├── ai/                 # segmentation.ts, faceLandmark.ts (Phase 2)
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
| `/privacy` | Kebijakan privasi (statis) | No |
| `/terms` | Syarat & ketentuan (statis) | No |
| `/print/[eventId]/qr` | Print kartu meja A4 (owner session) | Yes |

### 3.2 Dashboard Pages (Vendor)

| Route | Deskripsi | Auth |
|-------|-----------|------|
| `/dashboard` | Overview (events, foto, storage) | Yes |
| `/dashboard/events` | List semua event | Yes |
| `/dashboard/events/new` | Buat event baru | Yes |
| `/dashboard/events/[eventId]` | Detail event | Yes |
| `/dashboard/events/[eventId]/gallery` | Galeri foto + download ZIP | Yes |
| `/dashboard/events/[eventId]/qr` | Generate + cetak QR meja | Yes |
| `/dashboard/events/[eventId]/edit` | Edit event + upload frame kustom (slug immutable) | Yes |
| `/dashboard/events/[eventId]/analytics` | Analytics (Phase 3) | Yes |
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
| `/admin/settings` | Pengaturan platform (URL sosial media footer) |
| `/admin/seo` | Hub SEO & analytics 5 tab (meta/robots/sitemap/tracking/event/UTM) — detail `docs/research/seo-admin-reference.md` |
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
| `/api/admin/showcase` | POST/PATCH/DELETE | Kurasi foto Moments (upload/edit/hapus) | Superadmin (404 mask) |
| `/api/admin/settings` | PATCH | Simpan platform_settings (KV whitelist, validasi per-key) | Superadmin (404 mask) |
| `/api/admin/secrets` | PUT | Simpan rahasia (service account GA4/GSC) — nilai tidak pernah dikembalikan | Superadmin (404 mask) |
| `/api/admin/analytics/stats` | GET | Angka GA4 + GSC real (server-side, cache 5 mnt) | Superadmin (404 mask) |
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
6. Canvas: tampilkan frame overlay (PNG transparan dari events.frame_url)
7. Tamu tap "Ambil Momen"
8. Canvas.toDataURL('image/jpeg', 0.85) → compress (<800KB)
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
2. Read event + table via anon key (RLS: event aktif & belum expired)
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

> Bagian ini adalah **referensi teknis**, bukan scope MVP. Semua model jalan client-side, lazy-load, dan wajib punya fallback graceful. Detail task: `tasks/010-ar-filters.md`, `tasks/011-green-screen.md`.
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
  });
}

// compositing: mask → replace bg (drawImage bg dulu) → draw video dengan alpha mask
// feathering edge: blur ringan pada mask (ctx.filter = 'blur(2px)')
```

### 8.2 Face Landmark (AR Props)
```typescript
// src/lib/ai/faceLandmark.ts
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

export async function createFaceLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  );
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numFaces: 4, // support group photo kecil
  });
}
// landmark 10 (dahi) & 152 (dagu) → posisi/skala prop topi;
// landmark 33 & 263 (mata) → rotasi & posisi kacamata
```

### 8.3 Aturan Performa AI
- Lazy-load: model hanya dimuat setelah tamu aktifkan fitur (dynamic import).
- Target ≥ 25 FPS HP mid-range di atas 20 FPS hard-minimum; di bawah itu → matikan AR otomatis.
- Bundle utama photobooth dasar **tidak boleh** terpengaruh ukuran model (chunk terpisah).
- Fallback: segmentasi gagal/gelap → tawarkan mode tanpa efek, jangan blok capture.

---

## 9. Monitoring & Alerting

| Layer | Tool | Cakupan |
|---|---|---|
| Error tracking | Sentry | Frontend + API routes, alert critical errors |
| Logs | Log Node app di hPanel (Hostinger) | Request, error, deployment |
| DB logs | Supabase Logs | Query lambat, auth events |
| Uptime | UptimeRobot | Ping `temora.id` tiap 5 menit |
| Performance | — (nonaktif sementara) | Vercel Analytics no-op di luar Vercel; aktifkan Sentry perf/alternatif saat upgrade hosting menjelang launch |
| Billing alerts | Xendit Dashboard + cron reconciliation harian | Webhook gagal / invoice pending > 24 jam |

---

## 10. Tech Stack Reference

```
Frontend:   Next.js 16, React 19, Tailwind CSS 4, Radix UI, Lucide Icons
Font:       Cormorant Garamond (display) · Plus Jakarta Sans (body) · JetBrains Mono (data)
Backend:    Next.js API Routes (Node.js 20+)
Database:   Supabase (PostgreSQL 15)
Auth:       Supabase Auth (email/password)
Storage:    Supabase Storage (photos, thumbs, frames, zips)
Hosting:    Hostinger shared, Git deploy (prototipe; build --webpack)
Payment:    Xendit (invoice, payment link, webhook)
WhatsApp:   WhatsApp Business Cloud API
Libraries:  qrcode, jszip, sharp, zod, @supabase/ssr, chart.js (Phase 3)
Phase 2:    @mediapipe/tasks-vision (segmentation, face landmark)
CI/CD:      GitHub Actions (lint/typecheck/build/test) + Hostinger Git auto-deploy
Monitoring: Sentry · UptimeRobot · cron-job.org (pinger cron)
```

---

## 11. Environment Variables

SSOT daftar env — commit `.env.example` (tanpa nilai asli), runtime pakai `.env.local` (gitignored).

| Variable | Scope | Task | Keterangan |
|----------|-------|------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | 001 | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | 001 | Anon key (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | 001 | Service role — `admin.ts` saja |
| `NEXT_PUBLIC_APP_URL` | client | 001 | Base URL app (`http://localhost:3000` dev, `https://temora.id` prod) — QR & redirect & metadataBase. **Produksi wajib `https://`** (og:image dsb. ditolak scraper bila http) |
| `XENDIT_SECRET_KEY` | server | 008 | API key Xendit |
| `XENDIT_WEBHOOK_TOKEN` | server | 008 | Verifikasi callback webhook |
| `XENDIT_API_BASE` | server | 008 | Base URL API Xendit (default `https://api.xendit.co`) — override untuk sandbox |
| `WHATSAPP_TOKEN` | server | 009 | Meta Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | server | 009 | ID nomor WA Business |
| `WHATSAPP_VERIFY_TOKEN` | server | 009 | Verifikasi handshake webhook Meta |
| `WHATSAPP_APP_SECRET` | server | 009 | App Secret Meta — verifikasi header `x-hub-signature-256` webhook |
| `WA_GRAPH_BASE` | server | 009 | Base URL Graph API Meta (default `https://graph.facebook.com`) |
| `NEXT_PUBLIC_WA_ADMIN_NUMBER` | client | 009/017 | Nomor admin aktivasi (format 62…, tanpa +) |
| `NEXT_PUBLIC_SENTRY_DSN` | client + server | 015 | Error tracking (fallback `SENTRY_DSN` server-only) |
| `CRON_SECRET` | server | 015 | Bearer token proteksi route `/api/cron/*` (dipanggil pinger eksternal) |

Secret **tidak pernah** di-commit. Preview & production pakai nilai berbeda (task 015 §4.1).

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

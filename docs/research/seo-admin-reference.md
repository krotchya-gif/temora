# docs/seo.md — Anatomi Fitur Halaman Admin `/admin/seo`

> Dokumen teknis: menjelaskan **cara kerja & pola pembuatan** setiap fitur yang ada di
> halaman `src/app/(dashboard)/admin/seo/page.tsx`, plus **resep langkah-demi-langkah**
> menambah tab/fitur baru mengikuti pola yang sama.
> Referensi silang: `docs/riwayat.md` (riwayat bug), `AGENTS.md` (aturan repo).
> Terakhir diperbarui: 2026-08-26 (sesi 60B).

---

## 1. Ringkasan

`/admin/seo` adalah **hub 5 tab** untuk semua pengaturan SEO, analytics, iklan, dan
monitoring trafik situs publik. Semua pengaturan tersimpan di **satu row**
`landing_settings(key='hero')` — kolom-kolomnya dipisah per concern sehingga halaman
ini dan `admin/landing-settings` menulis **set kolom yang disjoint** dari row yang sama.

| Tab | Fungsi | Data yang disentuh |
|---|---|---|
| SEO & GEO | Meta tag, GEO/AI-crawler (llms.txt), upload `sitemap.xml` & `robots.txt` | `seo_*`, `ai_crawlers_block`, `geo_lat/lng`, `robots_content`, `sitemap_content` |
| Analytics | ID GA4/GTM/Clarity + **angka real** via Google API | `tracking_ga4_id/gtm_id/clarity_id`, `ga_service_account`, `tracking_ga4_property_id`, `tracking_gsc_site_url` |
| Marketing & Ads | Pixel Meta, Google Ads, TikTok Pixel | `tracking_pixel_id/ads_id/tiktok_id` |
| Event Monitor | Riwayat event konversi + retry kirim ke provider | tabel `event_logs` |
| Campaign UTM | Builder link UTM + laporan trafik per source | tabel `utm_visits` + join `orders.utm_source` |

---

## 2. Arsitektur & File Terlibat

```
┌─ admin/seo/page.tsx ────────────── client component (tab hub)
│    ├─ supabase-js ──► landing_settings (SELECT kolom seo_*/tracking_*, UPDATE saat Simpan)
│    ├─ POST /api/seo/upload-sitemap ──► simpan file .xml ke kolom sitemap_content
│    ├─ POST /api/seo/upload-robots  ──► simpan file .txt ke kolom robots_content
│    ├─ GET  /api/analytics/stats    ──► angka GA4/GSC real (server-side Google API)
│    └─ SELECT event_logs / utm_visits (+ join orders utk UTM)
│
├─ Konsumen sisi PUBLIK (yang membuat setting ini "hidup"):
│    ├─ src/components/SeoScripts.tsx ──► inject JSON-LD LocalBusiness (geo_lat/lng,
│    │     sameAs sosmed), gtag GA4, GTM, Clarity, Meta Pixel, Google Ads, TikTok,
│    │     meta verifikasi GSC — dibaca dari landing_settings oleh layout root
│    ├─ src/app/robots.txt/route.ts ──► generate robots.txt dinamis:
│    │     isi manual (robots_content) + blokir AI_CRAWLERS_BLOCK + baris Sitemap
│    ├─ src/app/sitemap.xml/route.ts ──► serve sitemap_content (fallback dinamis)
│    └─ src/app/llms.txt/route.ts ──► file llms.txt utk AI crawler (GEO)
│
└─ src/lib/google-analytics.ts ──► JWT service account → OAuth token
      → GA4 Data API (runReport) + Search Console API (searchAnalytics),
        scope readonly, hasil di-cache (getGa4StatsCached/getGscStatsCached)
```

### Skema data

**Kolom `landing_settings`** (lihat `supabase/migrations/000_full_schema.sql`):

| Kelompok | Kolom |
|---|---|
| Meta on-page | `seo_title`, `seo_description`, `seo_keywords`, `seo_og_image` |
| Tracking script | `tracking_ga4_id`, `tracking_gtm_id`, `tracking_clarity_id`, `tracking_pixel_id`, `tracking_ads_id`, `tracking_tiktok_id`, `gsc_verification` |
| Google API real | `ga_service_account` (JSONB — private key service account), `tracking_ga4_property_id`, `tracking_gsc_site_url` |
| GEO / AI | `ai_crawlers_block` (JSONB array nama bot), `geo_lat`, `geo_lng` |
| File statis | `robots_content`, `sitemap_content` |

**Tabel pendukung** (RLS aktif):

```sql
event_logs (id, event_name, label, page, value JSONB,
            status 'sent|pending|failed', provider, created_at)
  -- publik boleh INSERT (halaman landing), staff read, admin/owner kelola

utm_visits (id, utm_source, utm_medium, utm_campaign,
            landing_url, referrer, session_id, created_at)
  -- INSERT anonim saat kunjungan pertama dengan param ?utm_source=...
```

---

## 3. Pola Pembuatan: Tab Hub

Halaman ini adalah **pola acuan** tab hub (kini juga ditiru `admin/landing-settings`,
sesi 60). Anatomi kodenya:

### 3.1 Definisi tab

```tsx
type TabKey = 'seo' | 'analytics' | 'marketing' | 'events' | 'utm'

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'seo',       label: 'SEO & GEO',      icon: <Tag size={13} /> },
  { key: 'analytics', label: 'Analytics',       icon: <BarChart3 size={13} /> },
  // ...
]
const [tab, setTab] = useState<TabKey>('seo')
```

### 3.2 Render tab bar + konten kondisional

```tsx
{TABS.map((t) => (
  <button key={t.key} onClick={() => setTab(t.key)} style={{ /* pill: aktif #cc7030 */ }}>
    {t.icon} {t.label}
  </button>
))}

{tab === 'seo' && ( <div>…kartu Meta Tags, GEO, File SEO…</div> )}
{tab === 'analytics' && ( <div>…</div> )}
```

Tidak pakai routing/URL param — state React saja. Konten tiap tab = JSX inline
(dibungkus kartu `cardStyle` + header `cardHeader`, input memakai `inputStyle` —
tiga objek style bersama di level modul).

### 3.3 Satu objek form + satu tombol Simpan global

- `loadSettings()` — SELECT **kolom eksplisit** (bukan `select('*')`) dari
  `landing_settings(key='hero')`; `ga_service_account` di-stringify untuk textarea.
- Tombol **"Simpan Pengaturan"** di `PageHeader` memanggil `handleSave()` yang
  UPDATE semua kolom sekaligus (`|| null` agar string kosong tersimpan NULL;
  `ga_service_account` di-`JSON.parse` dengan validasi format sebelum masuk DB).

### 3.4 Lazy-load data berat per tab

```tsx
useEffect(() => {
  if (tab === 'analytics') loadAnalytics()   // GET /api/analytics/stats
  if (tab === 'events') loadEvents()         // event_logs LIMIT 100
  if (tab === 'utm') loadUtmReport()         // utm_visits + orders
}, [tab])
```

Data pengaturan (`loadSettings`) dimuat sekali di mount; data laporan dimuat
saat tab-nya dibuka pertama kali.

---

## 4. Detail Per Tab

### 4.1 Tab "SEO & GEO"

**Kartu Meta Tags** — `seo_title/description/keywords/og_image`. Dikonsumsi
metadata Next.js di layout/publik pages.

**Kartu GEO / AI (LLMO)** — daftar checkbox `AI_CRAWLERS` (14 bot: GPTBot,
ClaudeBot, PerplexityBot, dsb.). `toggleAiBot(bot)` tambah/hapus dari array
`ai_crawlers_block`. Field `geo_lat/geo_lng` untuk koordinat bisnis.
Konsumen: `robots.txt/route.ts` menambahkan `Disallow: /` per bot yang dicentang;
`SeoScripts.tsx` memakai lat/lng di JSON-LD `LocalBusiness`.

**Kartu File SEO** — upload `sitemap.xml` & `robots.txt` via `<input type="file">`
tersembunyi + `ref` (pola tombol-styled). Handler kirim `FormData` ke:
- `POST /api/seo/upload-sitemap` → validasi `.xml` → simpan teks ke `sitemap_content`
- `POST /api/seo/upload-robots` → validasi `.txt` → simpan ke `robots_content`
Keduanya di-guard **admin/owner + status='active'** (sesi 52 — dulunya tanpa auth).

### 4.2 Tab "Analytics"

Dua bagian: (a) **ID tracking** (GA4/GTM/Clarity/GSC-meta) — hanya string yang
disimpan; injeksi script dilakukan `SeoScripts.tsx` di sisi publik.
(b) **Angka Real via Google API**: admin isi `ga_service_account` (JSON lengkap
service account dengan private key), `tracking_ga4_property_id`, `tracking_gsc_site_url`.
Saat tab dibuka → `GET /api/analytics/stats`:
1. Guard: login + role `admin|owner` + `status='active'` (401/403)
2. Server baca kredensial dari DB, tukar **JWT → OAuth token**
   (scope `analytics.readonly` + `webmasters.readonly`)
3. Panggil GA4 `runReport` (users/sessions 7 hari) & GSC `searchAnalytics`
   (clicks/impressions/ctr/position) — **hanya angka agregat yang keluar**,
   private key tidak pernah dikirim ke browser
4. Cache in-memory agar tidak hit Google tiap reload
Jika belum dikonfigurasi/gagal → field `null` dan UI menampilkan status jujur.

### 4.3 Tab "Marketing & Ads"

Paling sederhana: 3 input ID (`tracking_pixel_id/ads_id/tiktok_id`) → disimpan →
di-inject `SeoScripts.tsx`.

### 4.4 Tab "Event Monitor"

Tabel `data-table` berisi 100 event terakhir dari `event_logs` (ditulis non-blocking
olehalaman publik lewat helper `src/lib/tracking.ts`: `view_detail`, `booking_start`,
`booking_submit`, `payment_success`, dst. — label human-readable di `EVENT_LABELS`).
Aksi **Retry**: `handleRetryEvent` update `status='sent'` langsung (client-side,
role dijaga RLS: hanya admin/owner bisa UPDATE).

### 4.5 Tab "Campaign UTM"

- **Builder**: form source/medium/campaign/content → generate URL + tombol copy
  (`copyUtm` via clipboard).
- **Laporan**: gabung klien-side `utm_visits` (jumlah kunjungan per source) dengan
  `orders.utm_source` (jumlah order + `total_amount` per source) — memberi gambaran
  source mana yang menghasilkan order, tanpa API eksternal.

---

## 5. Resep: Menambah Tab / Fitur Baru di Halaman Ini

Ikuti urutan ini (pola terkunci — jangan bikin pola paralel):

1. **Rancang data dulu.** Butuh kolom baru di `landing_settings`?
   - Buat migration idempotent via Supabase MCP (`ALTER TABLE … ADD COLUMN IF NOT EXISTS`)
   - **Sinkronkan `000_full_schema.sql` di pekerjaan yang sama** (aturan wajib repo)
   - Butuh tabel baru? Tiru pola `event_logs`/`utm_visits`: UUID PK, index
     `created_at DESC`, RLS aktif + policy eksplisit (publik insert / staff read /
     admin-owner kelola) — hindari subquery ke tabel sama (42P17).
2. **Daftarkan tab** — tambah union di `type TabKey` + entri di array `TABS`
   (pilih ikon lucide yang belum dipakai).
3. **State & loader** — tambah field ke `form`/state terkait + mapping
   `loadSettings()` (jangan lupa `?? ''`/`|| null` pairing dengan `handleSave`).
   Data laporan berat: buat fungsi `loadXxx()` + daftarkan di `useEffect [tab]`.
4. **UI** — render `{tab === 'xxx' && (...)}`; bungkus kartu dengan
   `cardStyle`+`cardHeader`, input `inputStyle`. Upload file: tiru pola ref +
   hidden input + tombol styled (atau komponen `ui/FileUploadButton.tsx`).
5. **Backend (opsional)** — kalau butuh endpoint: buat `route.ts` dengan guard
   wajib di awal handler (auth + role matrix + `status='active'`), sanitasi error
   via `lib/api-errors.ts`. Lihat `api/analytics/stats/route.ts` sebagai contoh.
6. **Sambungkan ke publik** — kalau setting-nya harus memengaruhi situs publik,
   tentukan konsumennya (`SeoScripts.tsx`, route `robots.txt/sitemap.xml/llms.txt`,
   atau layout metadata). Setting tanpa konsumen = fitur mati.
7. **Verifikasi** (wajib sebelum dianggap selesai):
   `npx tsc --noEmit` → `npm run build` → `npm run test:run` → uji manual alur
   simpan-muat (isi → Simpan → refresh → nilai balik) → cek halaman publik menerima
   efeknya.
8. **Catat** di `docs/riwayat.md` (format entri standar) bila termasuk perbaikan/
   perubahan perilaku; update README bila menambah tab permanen.

### Checklist anti-lupa

- [ ] Kolom baru = migration MCP + sinkron `000_full_schema.sql`
- [ ] Guard role di SEMUA endpoint baru (401/403 fail-closed)
- [ ] Kredensial sensitif (private key dll.) TIDAK PERNAH keluar ke response API
- [ ] String kosong → `NULL` saat save (pairing `?? ''` / `|| null`)
- [ ] Lazy-load data berat per tab (bukan sekali di mount)
- [ ] Verifikasi 4 langkah + uji muat-ulang settings

---

## 6. Keamanan & Role

| Permukaan | Guard |
|---|---|
| Halaman `/admin/seo` | Proxy + layout role-gate `admin` (konstanta shared `config/dashboard-roles.ts`) |
| `POST /api/seo/upload-*` | Login + `admin|owner` + `status='active'` (sesi 52) |
| `GET /api/analytics/stats` | Login + `admin|owner` + `status='active'`; kredensial tetap di server |
| `event_logs` UPDATE (retry) | RLS: hanya admin/owner |
| `event_logs`/`utm_visits` INSERT publik | Policy anon terbatas (insert-only) |

Prinsip: **semua rahasia (service account) tinggal di server**; browser hanya melihat
ID publik dan angka agregat.

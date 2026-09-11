# Database — TEMORA (Supabase PostgreSQL)

*Versi: 1.2 · Tanggal: 2026-08-25 · Status: Approved*
*Konsolidasi: skema MVP v1.0 (kanonik) + realtime publication + retention & migration strategy.*

---

## 1. Pendekatan

**Supabase (PostgreSQL 15)** — data relasional (vendor → event → table → photo), RLS untuk isolasi multi-tenant, Auth + Storage dari platform yang sama. Alasan detail: `docs/architecture.md` §2.

**Prinsip desain:**
- Multi-tenant by `vendor_id` — isolasi via RLS, bukan logika aplikasi saja.
- Foto tamu append-only; tidak diedit server-side.
- Skema ramping: tabel Phase 2/3 (`moments`, `sponsors`) **tidak** dibuat di MVP.
- Defense in depth: RLS adalah guard pertama, API route guard kedua.

## 2. Skema

> **Fase 2/3 aktif (2026-08-28):** tabel `moments` (task 012) & `sponsors`
> (task 013) kini dibuat via migrasi — keputusan terkunci #9 diperbarui.
> Semua tabel fase 2+ memakai pola isolasi yang sama (vendor-owned + RLS).

### 2.1 vendors
```sql
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,                          -- E.164, dipakai WhatsApp notif
  subscription_tier TEXT NOT NULL DEFAULT 'free'
      CHECK (subscription_tier IN ('free','basic','pro')),
  xendit_customer_id TEXT,
  wa_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  banned_at TIMESTAMPTZ,               -- task 019: ban admin; NULL = aktif
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vendors_banned ON vendors(banned_at) WHERE banned_at IS NOT NULL;
```
> Catatan: `id` = `auth.users.id` (Supabase Auth), disinkronkan via trigger `on_auth_user_created`. **Jangan** buat kolom `password_hash` — auth ditangani penuh Supabase Auth.
>
> `banned_at` (task 019): ban admin menolak login baru & memblokir sesi hidup di guard berikutnya, serta **menonaktifkan semua event** vendor (keputusan desain task 019 §2.12). Data tidak dihapus — unban hanya memulihkan login; pengaktifan ulang event manual oleh vendor (hormati batas tier aktif).

### 2.2 events
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,           -- URL publik custom (alias UUID); immutable; auto-generate atau diisi vendor
  theme TEXT CHECK (theme IN ('wedding','birthday','corporate','community','other')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,                 -- informasi saja (tanggal acara); tidak memblokir akses tamu
  location TEXT,
  frame_url TEXT,                      -- PNG transparan di Storage
  cover_template TEXT NOT NULL DEFAULT 'bloom'
    CHECK (cover_template IN ('bloom','rose','mono','night','paper')),
  cover_image_url TEXT,                -- JPG/PNG cover publik, opsional
  cover_title TEXT,                    -- NULL = pakai nama event
  cover_subtitle TEXT,
  cover_button_text TEXT NOT NULL DEFAULT 'Mulai motret',
  watermark_text TEXT,                 -- NULL = tanpa watermark (khusus Pro)
  watermark_position TEXT NOT NULL DEFAULT 'bottom-right'
    CHECK (watermark_position IN ('bottom-right','bottom-left','top-right','top-left')), -- preset posisi (Pro)
  camera_preset TEXT NOT NULL DEFAULT 'mono-minimal'
    CHECK (camera_preset IN ('darkroom','rose-gold','berry-pop','mono-minimal')),
  filter_id TEXT,                         -- NULL = Warna Asli; id dari katalog LUT terkurasi
  filter_strength NUMERIC NOT NULL DEFAULT 0.78
    CHECK (filter_strength >= 0 AND filter_strength <= 1),
  qr_template TEXT NOT NULL DEFAULT 'bloom'
    CHECK (qr_template IN ('bloom','rose','mono','night','paper')),
  qr_title TEXT,
  qr_subtitle TEXT,
  qr_tagline TEXT NOT NULL DEFAULT 'Keep the moments close.',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,              -- TTL foto; diset app layer saat create (default NOW()+30 hari), tanpa DB default
  photo_limit INT DEFAULT 100,         -- diset saat create dari tier vendor; NULL = unlimited (Pro)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]{6,60}$')
);
CREATE INDEX idx_events_vendor ON events(vendor_id);
```

### 2.3 tables (meja acara)
```sql
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,                 -- "Meja 1", "Table A", dst
  scan_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, label)
);
CREATE INDEX idx_tables_event ON tables(event_id);
```

### 2.4 photos
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,          -- path di bucket 'photos'
  thumb_path TEXT,                     -- versi kecil untuk grid
  width INT,
  height INT,
  size_bytes INT,
  metadata JSONB NOT NULL DEFAULT '{}', -- capture_token (Simpan/Bagikan) + client_upload_id (dedup retry offline)
  guest_saved_at TIMESTAMPTZ,          -- tamu menekan Simpan/Bagikan (sumber north star, PRD §4)
  deleted_at TIMESTAMPTZ,              -- soft delete (hard delete oleh cron 30 hari)
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_photos_event_time ON photos(event_id, taken_at DESC);
CREATE UNIQUE INDEX idx_photos_client_upload ON photos ((metadata->>'client_upload_id'))
  WHERE metadata->>'client_upload_id' IS NOT NULL;
```

### 2.5 subscriptions (riwayat billing)
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('basic','pro')),
  amount_idr INT NOT NULL,             -- harga terkunci saat transaksi
  status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending','paid','expired','failed')),
  xendit_invoice_id TEXT UNIQUE,       -- unik = idempotency webhook
  xendit_payment_url TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subs_vendor ON subscriptions(vendor_id);
```

### 2.6 whatsapp_logs
```sql
CREATE TABLE whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('welcome','event_created','photo_milestone','invoice','payment_ok','expiry_reminder')),
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> Fase 2+ sudah aktif (2026-08-28): `moments` (task 012) & `sponsors` (task 013) dibuat di §2.8.

### 2.6c admin_audit_logs (task 019)
```sql
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   actor_email TEXT NOT NULL,           -- snapshot; tahan bila akun terhapus nanti
   action TEXT NOT NULL,                -- set_tier | edit_vendor | ban_vendor |
                                        -- unban_vendor | delete_vendor |
                                        -- set_event_status | delete_photo |
                                        -- edit_settings | showcase_upload |
                                        -- showcase_edit | showcase_delete |
                                        -- event_retry
   target_type TEXT NOT NULL,           -- vendor | event | photo
   target_id TEXT,
   detail JSONB NOT NULL DEFAULT '{}',
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_time ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_target ON admin_audit_logs(target_type, target_id);
```
> Append-only: ditulis service role dari API admin; **tanpa policy** INSERT/UPDATE/DELETE untuk role biasa (immutable). Read via policy superadmin (`auth.jwt() -> 'app_metadata' ->> 'role' = 'superadmin'`) atau langsung service-role client di halaman `/admin/audit`. Daftar aksi aktual = union `AdminAction` di `src/lib/admin-audit.ts` (12 aksi per 2026-09-10 — live: `edit_settings` 20, `showcase_upload` 6, `event_retry` 5, dst.): `edit_settings` dipakai route settings+secrets; `showcase_edit` dipakai PATCH item **dan** reorder; halaman `/admin/audit` memetakan badge warna per aksi (fallback netral bila aksi baru belum dipetakan).

### 2.6d showcase_photos (task showcase moments)
```sql
CREATE TABLE showcase_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT,                  -- bucket publik 'showcase'; NULL bila sumbernya external_url
  title TEXT NOT NULL,                -- label acara/kota (marketing)
  caption TEXT,                       -- kutipan singkat opsional
  external_url TEXT,                  -- placeholder/kurasi via URL (Unsplash/Wikimedia/picsum)
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,             -- soft delete oleh admin (purge objek langsung)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_source CHECK (storage_path IS NOT NULL OR external_url IS NOT NULL)
);
CREATE INDEX idx_showcase_order ON showcase_photos(sort_order, created_at DESC);
```
> Konten kurasi milik platform — diinput **superadmin** lewat `/admin/showcase`, BUKAN foto tamu vendor (privasi, keputusan terkunci #8). RLS: SELECT anon/authenticated hanya baris `deleted_at IS NULL`; tanpa policy tulis → mutasi eksklusif service role dari API admin. Area media `public/showcase` dibaca publik. Saat gambar diganti, API mengunggah ke key `showcase/{ulid}.{ext}` baru, mengubah `storage_path` dan mengosongkan `external_url`, lalu menghapus objek lama setelah update DB sukses; bila update DB gagal, objek baru dibersihkan. Dipakai: rope landing (24 terbaru) & halaman `/moments`.

### 2.6e platform_settings (task sosial media)
```sql
CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
> KV pengaturan publik level-admin (social_instagram/tiktok/facebook). Read publik
> disengaja untuk footer; tulis eksklusif service role dari `/admin/settings`.
> Nilai kosong = fitur terkait disembunyikan dari halaman publik.

### 2.7 Aturan Tier & Limit (terkunci v1.2)

| Tier | Event aktif | Foto/event (`photo_limit` saat create) |
|------|-------------|----------------------------------------|
| Free | max 1 | 100 |
| Basic | max 3 | 500 |
| Pro | unlimited | `NULL` (unlimited) |

**Kapan `photo_limit` diset:** hanya saat **create event**, dari tier vendor saat itu. Upgrade tier **tidak** mengubah `photo_limit` event yang sudah ada.

**Free tier — event nonaktif:** unlimited. Hanya jumlah event **aktif** yang dibatasi (max 1).

**Downgrade / expiry ke Free** dengan >1 event aktif: event aktif **tetap jalan** (tamu masih bisa foto). Vendor **tidak bisa** create event baru atau mengaktifkan event lain sampai jumlah event aktif ≤ 1 (nonaktifkan manual dulu).

**`ends_at`:** informasi tanggal acara di dashboard saja — **tidak** memblokir upload tamu. Kontrol akses tamu via `is_active` + `expires_at`.

**Upload tamu:** jalur utama lewat API route (service role). RLS anon INSERT (§4) adalah guard cadangan, bukan jalur client.

**Validasi upload (API wajib):** `table_id` harus milik `event_id`; `client_upload_id` (UUID per capture) untuk dedup retry offline — jika duplikat, return row existing (200), bukan insert baru.

### 2.8 moments & sponsors (task 012–013, migrasi 0022)

```sql
-- Moments: caption + guestbook digital per foto (task 012)
CREATE TABLE moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE, -- nullable: moment tanpa foto
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 280),
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,              -- moderasi vendor
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_moments_event_time ON moments(event_id, created_at DESC);
CREATE INDEX idx_moments_event_hidden ON moments(event_id) WHERE is_hidden = FALSE;

-- Sponsors: logo partner di frame & kartu QR (task 013, tier Pro)
CREATE TABLE sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  logo_path TEXT,                   -- {bucket}/{key} — bucket publik 'sponsors'
  position TEXT NOT NULL CHECK (position IN ('frame','qr')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sponsors_event ON sponsors(event_id, is_active);
```

**Aturan moments (task 012):**
- Anon INSERT (guard cadangan, API route jalur utama) — hanya event aktif & belum expired,
  rate limit 1 moment/60 detik per `table_id` (+IP) — validasi otoritatif di API.
- Tamu **tidak bisa** SELECT moments (privasi, pola sama dengan photos).
- Vendor baca/kelola semua moments eventnya; `is_hidden` menyembunyikan dari feed
  publik vendor & export — hard delete mengikuti cascade event.
- Realtime publication `moments` untuk feed dashboard live.

**Aturan sponsors (task 013):**
- Hanya tier **Pro** (dan superadmin) — API menolak 403 untuk Free/Basic (tier dibaca
  dari DB, bukan client).
- Logo aktif `position='frame'` digambar ke hasil capture berikutnya (tanpa re-process
  foto lama); `position='qr'` tampil di kartu print QR meja.
- Consent screen photobooth menyebut sponsor saat ada sponsor frame aktif; tidak
  menyebut bila tidak ada.
- Deactivate/hapus sponsor → propagasi < 30 detik (dibaca per-capture, bukan cache).

## 3. Triggers

```sql
-- updated_at otomatis
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vendors_touch BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_events_touch BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- sinkron auth.users -> vendors
CREATE OR REPLACE FUNCTION handle_new_vendor() RETURNS trigger AS $$
BEGIN
  INSERT INTO vendors (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name','Vendor'));
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_vendor();
```

## 4. Row-Level Security (RLS)

```sql
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables  ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;   -- task 012
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;  -- task 013

-- Vendor kelola dirinya
CREATE POLICY v_self ON vendors FOR ALL
  USING (auth.uid() = id);

-- Vendor kelola event miliknya
CREATE POLICY e_owner ON events FOR ALL
  USING (auth.uid() = vendor_id);

-- TAMU (anon): hanya baca event AKTIF via anon key (untuk halaman photobooth)
CREATE POLICY e_public_read ON events FOR SELECT TO anon
  USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- Tamu baca daftar meja event aktif & belum expired
CREATE POLICY t_public_read ON tables FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM events e
                 WHERE e.id = event_id AND e.is_active
                   AND (e.expires_at IS NULL OR e.expires_at > NOW())));

-- Vendor kelola meja milik eventnya (generate/hapus via dashboard; task 005)
CREATE POLICY t_owner_all ON tables FOR ALL
  USING (EXISTS (SELECT 1 FROM events e
                 WHERE e.id = event_id AND e.vendor_id = auth.uid()));

-- Tamu UPLOAD foto: guard cadangan (jalur utama = API service role, §2.7).
-- Eligibilitas dievaluasi via private.can_guest_upload() — SECURITY DEFINER,
-- karena subquery kuota langsung ke tabel photos di dalam policy photos
-- memicu infinite recursion (42P17). Fungsi tinggal di schema `private`
-- agar tidak terekspos PostgREST.
CREATE POLICY p_guest_insert ON photos FOR INSERT TO anon
  WITH CHECK (private.can_guest_upload(event_id));

-- TAMU TIDAK BISA baca foto (privasi by design).
-- Vendor baca/kelola foto event miliknya:
CREATE POLICY p_owner_all ON photos FOR ALL
  USING (EXISTS (SELECT 1 FROM events e
                 WHERE e.id = event_id AND e.vendor_id = auth.uid()));

-- Subscription hanya milik vendor
CREATE POLICY s_owner ON subscriptions FOR ALL
  USING (auth.uid() = vendor_id);

-- Log WhatsApp hanya milik vendor (ditulis service role; tanpa akses anon)
CREATE POLICY w_owner ON whatsapp_logs FOR ALL
  USING (auth.uid() = vendor_id);

-- Moments (task 012): tamu tulis (guard cadangan), vendor baca/kelola
CREATE POLICY m_public_insert ON moments FOR INSERT TO anon
  WITH CHECK (private.can_guest_upload(event_id));
CREATE POLICY m_owner_all ON moments FOR ALL
  USING (EXISTS (SELECT 1 FROM events e
                 WHERE e.id = event_id AND e.vendor_id = auth.uid()));

-- Sponsors (task 013): baca publik baris aktif (consent + QR card); kelola vendor
CREATE POLICY sp_public_read ON sponsors FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);
CREATE POLICY sp_owner_all ON sponsors FOR ALL
  USING (EXISTS (SELECT 1 FROM events e
                 WHERE e.id = event_id AND e.vendor_id = auth.uid()));
```

**Catatan penting:** limit foto via subquery di policy adalah guard pertama; validasi kedua tetap dilakukan di API route (defense in depth). Service role bypass RLS — **hanya** boleh dipakai di server/API routes, never di client.

> Catatan `p_guest_insert` (revisi 0012/0013): fungsi `private.can_guest_upload` berjalan sebagai SECURITY DEFINER sehingga menghitung kuota foto riil (bukan advisory) — event aktif + belum expired + limit terhormat (`NULL` = unlimited/Pro). Validasi otoritatif tetap juga di API route service role (§2.7) sesuai prinsip defense in depth.

> Catatan policy owner (revisi 0013): semua policy owner (`v_self`, `e_owner`, `t_owner_all`, `p_owner_all`, `s_owner`, `w_owner`) dibatasi `TO authenticated` dan membungkus `auth.uid()` sebagai `(select auth.uid())` (initPlan — hindari re-evaluasi per baris; sekaligus hilangkan overlap multiple-permissive dengan policy tamu).

> ⚠️ Anti-pattern yang sengaja TIDAK diambil dari draft lama: policy `FOR SELECT USING (true)` pada photos (membuat semua foto publik) dan `FOR UPDATE USING (true)` pada guests. Jangan pernah diterapkan.

## 5. Realtime Publication

Galeri vendor live-update (task 006): foto baru muncul tanpa reload.

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE photos;
ALTER PUBLICATION supabase_realtime ADD TABLE moments;  -- task 012
```

Client subscribe dengan filter per event:
```typescript
supabase.channel(`photos:${eventId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'photos', filter: `event_id=eq.${eventId}` },
    handleNewPhoto)
  .subscribe();
```
> Hanya subscribe ke channel event aktif — jangan global subscribe (hemat koneksi & kuota realtime).

## 6. File Storage Hostinger

| Area | Access | Isi |
|---|---|---|
| `private/photos` | **Private** — dibaca lewat API Next.js setelah ownership check | Foto tamu JPEG |
| `public/thumbs` | Public read | Thumbnail 320px |
| `public/frames` | Public read | Frame PNG vendor |
| `private/zips` | Private — dibaca lewat API Next.js | Hasil export ZIP |
| `public/showcase` | Public read | Foto kurasi platform |
| `public/sponsors` | Public read | Logo sponsor |

Path convention:
```
photos/{event_id}/{table_id}/{ulid}.jpg
thumbs/{event_id}/{ulid}_320.jpg
frames/{vendor_id}/{event_id}/frame.png
zips/{event_id}/{job_id}.zip
sponsors/{event_id}/{ulid}.png
showcase/{ulid}.jpg
```

Path pada kolom database adalah relative key media service tanpa prefix bucket.
File public memakai URL `HOSTINGER_MEDIA_URL`; file private tidak pernah
diekspos sebagai URL langsung.

> **Konvensi:** key di kolom DB sama dengan key media service dan selalu diawali area
> (`photos/`, `thumbs/`, `frames/`, dan seterusnya). URL publik dibentuk menjadi
> `https://media.temora.site/public/{key}`; foto dan ZIP private hanya lewat API Next.js.
> File lama di Supabase Storage tidak dimigrasikan karena environment masih testing.

## 7. Data Retention & Privacy

| Policy | Rule |
|--------|------|
| Photo expiry | Cron harian hapus foto event yang `expires_at` lewat (Storage object + row) |
| Soft delete | Hapus manual → set `deleted_at`; cron hard-delete Storage 30 hari kemudian |
| Guest data | Tanpa nama/email wajib — tamu anonim by default |
| AI consent (Phase 2) | Opt-in eksplisit sebelum fitur segmentasi/AR memproses wajah |
| No facial recognition | Hanya segmentasi & landmark — tidak pernah identifikasi individu |

## 8. Tabel Pendukung Marketing/SEO (migrasi 0020–0021)

| Tabel/Kolom | Akses | Isi |
|---|---|---|
| `platform_settings` (+key SEO/tracking) | Public read (memang untuk halaman publik) | `seo_title/description/keywords/og_image`, `robots_content`, `sitemap_content`, `ai_crawlers_block` (koma), `geo_lat/lng`, `tracking_ga4_id/gtm_id/clarity_id/pixel_id/ads_id/tiktok_id`, `gsc_verification`, `tracking_ga4_property_id`, `tracking_gsc_site_url` (identifier GSC persis; produksi: `https://temora.site/`) |
| `admin_secrets` | **Tanpa public read** — hanya service role + API superadmin | `ga_service_account` (JSON service account GA4/GSC) — **rahasia, dilarang keluar ke client** |
| `event_logs` | Anon **insert-only** (`status='pending'`); read/update superadmin | Event konversi marketing: `wa_click`, `upgrade_click`, `payment_success` |
| `utm_visits` | Anon insert-only | Kunjungan kampanye `?utm_*` |
| `subscriptions.utm_source` | — | Atribusi konversi kampanye (diisi checkout bila client punya UTM) |

> ⚠️ Jangan pernah menaruh rahasia (service account, token) di `platform_settings` —
> tabel itu **public read**. Sekret wajib di `admin_secrets` (anti-pattern
> `USING(true)` dilarang keras di sana, database.md §4).
> Konsumen publik & pola pembuatan: `docs/research/seo-admin-reference.md`.

## 9. Aturan Umum (wajib)

1. Semua string user-generated di-sanitize (strip `< > \``, batasi panjang).
2. Tulisan multi-step (upload file + insert row) → transaksi / RPC supaya atomik.
3. Jangan simpan secret di DB; `.env` single source of truth.
4. Migrasi via `supabase migration` files — tidak ada DDL manual di dashboard.
5. TTL foto: job harian hapus foto event yang `expires_at` sudah lewat (Storage + row).

## 10. Migration Strategy

- Gunakan Supabase CLI: `supabase migration new <name>` → edit file → `supabase db push`.
- **Never** edit migration yang sudah applied — selalu buat migration baru.
- Test lokal dengan `supabase start` + `supabase db reset` sebelum push ke production.
- RLS policies ditaruh di migration yang sama dengan tabelnya.
- Simpan snapshot baseline via `supabase db dump` setelah skema stabil.

## 11. Performance Considerations

1. Pagination galeri (20 foto/load) — index `(event_id, taken_at DESC)` sudah mendukung.
2. ZIP export: streaming server-side, tidak load semua ke memory sekaligus.
3. Thumbnail dibuat client-side (canvas resize) sebelum upload — hemat bandwidth.
4. Realtime: filter channel per `event_id`.
5. Analytics (Phase 3): query agregat murni SQL + cache 60s, tanpa service tambahan.

## 12. API Akses (kode)

| Module | Fungsi |
|---|---|
| `src/lib/supabase/client.ts` | Browser client (anon key) — read publik + Realtime |
| `src/lib/supabase/server.ts` | Server client (anon + cookie session) — vendor auth & RLS |
| `src/lib/supabase/admin.ts` | Service role — upload tamu, cron, webhook (API routes only) |

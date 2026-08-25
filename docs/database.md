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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
> Catatan: `id` = `auth.users.id` (Supabase Auth), disinkronkan via trigger `on_auth_user_created`. **Jangan** buat kolom `password_hash` — auth ditangani penuh Supabase Auth.

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
  watermark_text TEXT DEFAULT 'Keep it close. Keep it TEMORA.',
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

> Phase 2+ (buat migrasinya nanti, jangan sekarang): `moments` (task 012 — caption + guestbook), `sponsors` (task 013). Tidak dibuat di MVP agar skema tetap ramping.

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

-- Tamu UPLOAD foto: guard cadangan (jalur utama = API service role, §2.7)
CREATE POLICY p_guest_insert ON photos FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id
        AND e.is_active
        AND (e.expires_at IS NULL OR e.expires_at > NOW())
        AND (
          e.photo_limit IS NULL
          OR (SELECT COUNT(*) FROM photos p
              WHERE p.event_id = e.id AND p.deleted_at IS NULL) < e.photo_limit
        )
    )
  );

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
```

**Catatan penting:** limit foto via subquery di policy adalah guard pertama; validasi kedua tetap dilakukan di API route (defense in depth). Service role bypass RLS — **hanya** boleh dipakai di server/API routes, never di client.

> ⚠️ Anti-pattern yang sengaja TIDAK diambil dari draft lama: policy `FOR SELECT USING (true)` pada photos (membuat semua foto publik) dan `FOR UPDATE USING (true)` pada guests. Jangan pernah diterapkan.

## 5. Realtime Publication

Galeri vendor live-update (task 006): foto baru muncul tanpa reload.

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE photos;
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

## 6. Storage Buckets

| Bucket | Access | Isi |
|---|---|---|
| `photos` | Public read via signed URL preferred, insert via service role only | Foto tamu JPEG |
| `thumbs` | Public read | Thumbnail 320px |
| `frames` | Public read | Frame PNG vendor |
| `zips` | Signed URL 15 menit | Hasil export ZIP |

Path convention:
```
photos/{event_id}/{table_id}/{ulid}.jpg
thumbs/{event_id}/{ulid}_320.jpg
frames/{vendor_id}/{event_id}/frame.png
zips/{event_id}/temora-{slug}.zip
```

## 7. Data Retention & Privacy

| Policy | Rule |
|--------|------|
| Photo expiry | Cron harian hapus foto event yang `expires_at` lewat (Storage object + row) |
| Soft delete | Hapus manual → set `deleted_at`; cron hard-delete Storage 30 hari kemudian |
| Guest data | Tanpa nama/email wajib — tamu anonim by default |
| AI consent (Phase 2) | Opt-in eksplisit sebelum fitur segmentasi/AR memproses wajah |
| No facial recognition | Hanya segmentasi & landmark — tidak pernah identifikasi individu |

## 8. Aturan Umum (wajib)

1. Semua string user-generated di-sanitize (strip `< > \``, batasi panjang).
2. Tulisan multi-step (upload file + insert row) → transaksi / RPC supaya atomik.
3. Jangan simpan secret di DB; `.env` single source of truth.
4. Migrasi via `supabase migration` files — tidak ada DDL manual di dashboard.
5. TTL foto: job harian hapus foto event yang `expires_at` sudah lewat (Storage + row).

## 9. Migration Strategy

- Gunakan Supabase CLI: `supabase migration new <name>` → edit file → `supabase db push`.
- **Never** edit migration yang sudah applied — selalu buat migration baru.
- Test lokal dengan `supabase start` + `supabase db reset` sebelum push ke production.
- RLS policies ditaruh di migration yang sama dengan tabelnya.
- Simpan snapshot baseline via `supabase db dump` setelah skema stabil.

## 10. Performance Considerations

1. Pagination galeri (20 foto/load) — index `(event_id, taken_at DESC)` sudah mendukung.
2. ZIP export: streaming server-side, tidak load semua ke memory sekaligus.
3. Thumbnail dibuat client-side (canvas resize) sebelum upload — hemat bandwidth.
4. Realtime: filter channel per `event_id`.
5. Analytics (Phase 3): query agregat murni SQL + cache 60s, tanpa service tambahan.

## 11. API Akses (kode)

| Module | Fungsi |
|---|---|
| `src/lib/supabase/client.ts` | Browser client (anon key) — read publik + Realtime |
| `src/lib/supabase/server.ts` | Server client (anon + cookie session) — vendor auth & RLS |
| `src/lib/supabase/admin.ts` | Service role — upload tamu, cron, webhook (API routes only) |

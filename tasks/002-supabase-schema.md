# Task 002 — Supabase Schema (Tabel + RLS + Storage)

*Status: Selesai (2026-08-26) — 13 migrasi applied ke project remote `ekuunbcyplxibcnnroeb` + seed; seluruh AC diverifikasi live (lihat qa-report) · Prioritas: High · Phase: MVP*

Depends on: 001 (supabase init + folder scaffold)

---

## 1. Tujuan

Deploy skema database lengkap sesuai `docs/database.md`: tabel, trigger, RLS policies, storage buckets.

## 2. Scope

- Migration files: `vendors`, `events`, `tables`, `photos`, `subscriptions`, `whatsapp_logs`.
- Trigger `touch_updated_at` + `handle_new_vendor` (sinkron auth.users → vendors).
- Semua RLS policies sesuai database.md §4 (owner isolation + guest read/upload terbatas).
- Storage buckets: `photos`, `thumbs`, `frames`, `zips` + storage policies.
- Seed data dummy untuk dev (1 vendor test + 1 event + 2 meja).

## 3. Non-Scope

- ❌ Tabel `moments` & `sponsors` (Phase 2/3).
- ❌ Job TTL cleanup (bikin barebone di task 006).

## 4. Desain

### 4.1 Migration convention
```
supabase/migrations/
├── 0001_extensions.sql        -- pgcrypto dll
├── 0002_vendors.sql
├── 0003_events.sql
├── 0004_tables_photos.sql
├── 0005_subscriptions_wa.sql
├── 0006_triggers.sql
├── 0007_rls.sql
└── 0008_storage.sql
```

### 4.2 Catatan penting RLS
- Policy insert photos untuk anon = guard cadangan (jalur utama upload via API service role). Validasi limit foto + NULL=unlimited — database.md §2.7 & §4.
- Service role bypass RLS — hanya dipakai di API routes, never di client.

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `supabase/migrations/*.sql` | baru |
| `supabase/seed.sql` | data dummy dev |

## 6. Acceptance Criteria

- [x] Migrasi jalan bersih tanpa error — applied via migration history remote (setara `db push`; CLI belum login access token). Ditemukan & diperbaiki bug latent: infinite recursion RLS pada `p_guest_insert` → migrasi 0012/0013 (`private.can_guest_upload` SECURITY DEFINER).
- [x] Vendor A tidak bisa baca/event milik Vendor B. *(terverifikasi manual 2 akun vendor, 2026-08-28)*
- [x] Anon bisa SELECT event aktif, tidak bisa SELECT foto. (live: event=1, foto=0)
- [x] Anon bisa INSERT foto ke event aktif; gagal jika event nonaktif, expired, atau limit habis. Pro tier (photo_limit NULL) tidak diblokir. (5 skenario live PASS)
- [x] Unique index `client_upload_id` mencegah duplikat retry offline. (SQL 23505 + app-level `duplicate:true`)
- [x] Signup user baru otomatis membuat row `vendors`. (trigger `on_auth_user_created` teruji via admin-create; nama dari `raw_user_meta_data`)
- [x] Bucket + policies aktif: upload via service role ok (200), baca publik ok untuk `thumbs` (anon 200).

> Temuan tambahan saat verifikasi (2026-08-26): pola `.eq("deleted_at", null)` di 13 titik kode menghasilkan error PostgREST `22007` (harusnya `.is(..., null)`) — diperbaiki massal; dedup/saved/galeri kini lolos smoke test.

## 7. Catatan

Simpan snapshot schema via `supabase db dump` setelah stabil — jadi baseline dokumentasi.

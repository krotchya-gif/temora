# Task 019 — Security Hardening + Admin v2 (Manajemen Vendor)

*Status: Selesai (2026-08-26) — seluruh AC diverifikasi live · Prioritas: High · Phase: MVP+*

Depends on: 018 (superadmin dasar), 008 (checkout), 009 (upload WA trigger)

---

## 1. Tujuan

Menutup temuan audit keamanan ronde 2 dan melengkapi dashboard admin menjadi
alat operasional penuh: manajemen vendor (edit/ban/hapus permanen), jejak
audit yang terlihat di UI, serta pemisahan peran total (1 akun 1 peran).

## 2. Keputusan Desain

### Keamanan
1. **Sanitasi query pencarian** sebelum masuk `.or()` PostgREST — escape
   metakarakter `,().%_` (temuan injection `admin/vendors`).
2. **Rate limit app-level**: login & signup 10/min/IP · checkout 3/min/user ·
   ZIP 2/min/user (limiter in-memory existing; catatan multi-instance tetap).
3. **Magic-byte JPEG** (`FFD8FF`) wajib untuk foto utama & thumb; thumb selalu
   disimpan dengan content-type `image/jpeg` (bucket thumbs publik).
4. **Cookie auth `httpOnly: true`** di server.ts + proxy.ts.
5. **`assertSameOrigin()`** pada semua route mutasi non-webhook/cron —
   pembanding Origin vs host request (allowlist env).
6. Billing page: filter eksplisit `.eq("id", user.id)` + tangani `.single()`.
7. CRON_SECRET & verify-token WA dibandingkan constant-time (konsistensi).
8. `/api/health`: respons generik tanpa status env.

### Peran terpisah (1 akun 1 peran)
9. Superadmin membuka `/dashboard` → redirect `/admin`; vendor tak pernah
   melihat Panel Admin; cross-link antar-shell dihapus.
10. Superadmin = operator murni. Kebutuhan "jual sebagai vendor" → akun lain.

### Manajemen vendor
11. Kolom baru `vendors.banned_at timestamptz` (migrasi 0015).
12. **Ban** = set `banned_at` + auto-nonaktifkan semua event vendor (keputusan
    user) + sesi mati di guard berikutnya + login baru ditolak. Data utuh;
    unban tidak mengaktifkan ulang event otomatis (vendor pilih sendiri,
    hormati batas tier aktif).
13. **Edit profil**: nama/perusahaan/telepon/opt-in via form. Email diubah
    tersinkron (`auth.users` via Admin API + `vendors`).
14. **Hapus permanen**: konfirmasi ketik email → purge Storage semua event →
    delete baris vendor (cascade) → delete auth user. Audit ditulis SEBELUM
    eksekusi. Tidak dapat dibatalkan.
15. **Tabel `admin_audit_logs`** (migrasi 0014) append-only: tulis via service
    role dari API admin; RLS read khusus superadmin via `auth.jwt()`; tanpa
    policy INSERT/UPDATE/DELETE untuk role biasa.

## 3. Scope File

- Migrasi: `0014_admin_audit_logs.sql`, `0015_vendors_banned_at.sql`
- Lib baru: `src/lib/security.ts` (sanitize/origin/jpeg/timingSafe),
  `src/lib/admin-audit.ts` (`logAdminAction`)
- API baru: `PATCH /api/admin/vendors/[vendorId]`, `POST .../ban`,
  `DELETE /api/admin/vendors/[vendorId]`
- Halaman baru: `/admin/vendors/[vendorId]`, `/admin/audit`, loading skeletons
- Ubah: proxy.ts, semua route mutasi (origin check), login/signup/checkout/
  zip/upload (rate limit & magic bytes), health, billing page, AdminShell,
  DashboardShell, overview, list pages (pagination/search)
- Test: `tests/unit/security.test.ts`

## 4. Non-Scope

- ❌ Rate limiter global persisten (Redis/Upstash) — backlog saat multi-region
- ❌ MFA superadmin (didokumentasikan sebagai rekomendasi runbook)
- ❌ Impersonasi akun vendor
- ❌ Export data sebelum hapus permanen (admin diminta konfirmasi sadar)

## 5. Acceptance Criteria

### P0 Keamanan
- [x] Payload injection di `?q=` dinetralkan (unit test `sanitizeSearchQuery` + live: payload `%2Cemail.eq.` → halaman 200 normal).
- [x] Login dibatasi — 12 attempt cepat: 8 lolos ke auth (401), sisanya 429.
- [x] Upload file bukan-JPEG (magic byte palsu: PNG menyamar .jpg) → ditolak 415 (live).
- [x] Cookie `sb-*` ber-flag HttpOnly di response login (dicek header cookie jar).
- [x] Mutasi dengan Origin asing → 403 (live); webhook Xendit/Meta & cron tanpa origin check by design.
- [x] Billing page memakai filter owner eksplisit `.eq("id", user.id)` + error ditangani.

### Admin v2
- [x] Superadmin buka `/dashboard` → 307 ke `/admin`; tombol lintas-shell dihapus (1 akun 1 peran).
- [x] Edit profil vendor tersimpan + ter-audit `edit_vendor` (live).
- [x] Ban: login baru 403, sesi hidup diblokir layout→login, **semua event otomatis nonaktif** (live: is_active=false), audit `ban_vendor`. Unban memulihkan login (live).
- [x] Hapus permanen: email salah → 400; email cocok → storage di-purge, baris kaskade hilang, auth user terhapus, audit `delete_vendor` terekam sebelum eksekusi (live, 2×).
- [x] `/admin/audit` menampilkan feed (200) dengan badge aksi + link target.
- [x] Overview menampilkan breakdown tier+ban, subs paid/pending/expired, WA gagal 7 hari, estimasi storage, 8 audit terakhir.

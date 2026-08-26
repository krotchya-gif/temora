# Task 018 — Superadmin Dashboard (`/admin`)

*Status: Selesai (2026-08-26) — seluruh AC diverifikasi live; superadmin pertama aktif · Prioritas: High · Phase: MVP+ (alat operasional platform)*

Depends on: 003 (auth), 007 (dashboard pattern)

---

## 1. Tujuan

Pemilik platform memantau vendor/event lintas-akun dan melakukan aksi
operasional (kelola tier, moderasi) dari dalam aplikasi — tanpa akses mentah
Supabase Dashboard.

## 2. Keputusan Desain

1. **Penanda role di `auth.users.app_metadata.role = 'superadmin'`** — hanya
   bisa diset via Admin API/server; vendor tidak mungkin self-promote.
   *Ditolak*: kolom `vendors.role` — policy `v_self FOR ALL` memungkinkan
   vendor meng-update barisnya sendiri (celah eskalasi).
2. **Nol policy RLS baru & nol tabel baru** — query lintas-vendor lewat pola
   `createAdminClient()` (service role) yang sudah ada, selalu setelah cek role.
3. **Guard 3 lapis**: `proxy.ts` matcher `/admin/:path*` (login + role) →
   layout `/admin` cek ulang → tiap API route cek ulang.
4. Endpoint non-admin yang mencoba akses → **404 mask** (konsisten pola repo).
5. Audit aksi moderasi/tier via log terstruktur `[admin]` (Log Node app hPanel) —
   skema tetap ramping (database.md §1).
6. Perubahan tier hanya berpengaruh ke event **baru** (`photo_limit` dikunci
   saat create event — keputusan terkunci #13); UI wajib memberitahu ini.

## 3. Scope

### Halaman
| Route | Isi |
|---|---|
| `/admin` | Statistik global: vendor, event aktif/total, foto, distribusi tier |
| `/admin/vendors` | Daftar vendor + pencarian + aksi ganti tier |
| `/admin/events` | Semua event + filter status + aksi nonaktifkan |
| `/admin/events/[eventId]` | Detail + grid foto + hapus foto (soft delete) |
| `/admin/seo` | Hub SEO & analytics 5 tab (SEO/GEO, Analytics, Marketing, Event Monitor, UTM) — detail architecture.md §3.2 |

### API
| Endpoint | Fungsi |
|---|---|
| `PUT /api/admin/vendors/[vendorId]/tier` | Set tier (`free/basic/pro`) |
| `PATCH /api/admin/events/[eventId]/status` | Set `is_active` |
| `DELETE /api/admin/events/[eventId]/photos/[photoId]` | Soft delete foto |
| `PATCH /api/admin/settings` | KV whitelist (sosial + SEO/tracking — validasi per-key) |
| `PUT /api/admin/secrets` | Rahasia (service account GA4/GSC) — tidak pernah dikembalikan |
| `GET /api/admin/analytics/stats` | Angka GA4 + GSC real (cache 5 mnt) |
| `GET /api/admin/events` · `POST …/[id]/retry` | Event monitor + retry |
| `GET /api/admin/utm/report` | Laporan kunjungan & konversi per source UTM |

## 4. Non-Scope

- ❌ Manajemen superadmin kedua dari UI (promosi tetap via runbook SQL)
- ❌ Impersonasi akun vendor
- ❌ Tabel audit DB terpisah (naikkan bila kebutuhan compliance muncul)
- ❌ Edit data vendor lain di luar tier

## 5. Bootstrap (runbook)

Superadmin pertama dibuat manual: daftar normal → promosi via SQL
(`docs/runbook.md §Superadmin`) → login ulang agar klaim JWT baru aktif.

## 6. Acceptance Criteria

- [x] Vendor biasa / anonim akses `/admin` → ditolak (anonim 307 → /login; vendor biasa 307 → /dashboard; API tanpa sesi 404). Live test 2026-08-26.
- [x] Superadmin melihat statistik global dan list lintas-vendor (overview + vendors + events + detail: HTTP 200 live).
- [x] Ganti tier tersimpan dan ter-audit di log (free→pro→revert di DB; baris audit `[admin] set_tier` tercatat).
- [x] Event yang dinonaktifkan superadmin langsung menolak upload tamu (upload 404 saat is_active=false; RLS `can_guest_upload` juga menolak).
- [x] Hapus foto oleh superadmin = soft delete (`deleted_at` terisi, hilang dari galeri).
- [x] Runbook bootstrap teruji pada akun superadmin pertama (`calysta@temora.com`, promosi 2026-08-26).

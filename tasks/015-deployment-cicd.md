# Task 015 — Deployment Production + CI/CD + Monitoring

*Status: Ready · Prioritas: High · Phase: MVP (wajib sebelum launch)*

Depends on: 008, 009

---

## 1. Tujuan

Pipeline rilis yang aman dan terpantau: setiap push tervalidasi otomatis, production punya domain + monitoring + alerting, dan insiden bisa dideteksi sebelum vendor merasakannya.

## 2. Scope

- **Vercel project**: repo GitHub terhubung; env vars lengkap terpasang (semua key dari task 001).
- **Domain produksi** `temora.id` + redirect www → apex; SSL otomatis.
- **GitHub Actions CI** tiap push/PR:
  - `lint` (ESLint) + `typecheck` (tsc) + build.
  - Gagal CI = blok merge ke `main`.
- **Branching convention**: `main` = auto-deploy production; PR = preview URL per branch.
- **Supabase production**: project terpisah dari dev; migrasi di-push via CLI (`supabase db push`), tidak pernah DDL manual dashboard.
- **Monitoring** (sesuai architecture.md §9):
  - Sentry — error tracking frontend + API routes.
  - UptimeRobot — ping `/` tiap 5 menit.
  - Vercel Analytics — web vitals photobooth & dashboard.
- **Cron jobs Vercel** terdaftar rapi di `vercel.json` sesuai architecture.md §12.
- `.env.example` diverifikasi lengkap (bootstrap di task 001, review di task ini).
- Halaman statis `/privacy` & `/terms` live (konten dasar; review hukum formal menyusul).
- Custom SMTP untuk email verifikasi Supabase — sender default dibatasi ketat di produksi.
- Runbook singkat: cara rollback deploy, restore Supabase point-in-time, dan prosedur storage threshold (≥ 80% ≈ 800MB → upgrade Supabase Pro).

## 3. Non-Scope

- ❌ Multi-region / read replicas (scale nanti).
- ❌ Blue-green deployment (Vercel atomic deploy sudah cukup).

## 4. Desain

### 4.1 Environment matrix
| Env | Vercel | Supabase | Domain |
|---|---|---|---|
| Preview | per-PR | Dev project | `*-temora.vercel.app` |
| Production | `main` | Production project | `temora.id` |

Secret webhook Xendit & WhatsApp berbeda per env — jangan pernah share.

### 4.2 Checklist go-live
```
[ ] Semua acceptance criteria tasks MVP (001–009 · 015–017) ✅
[ ] Halaman /privacy & /terms live dan terisi
[ ] Custom SMTP email verifikasi terpasang & teruji kirim-masuk
[ ] Monitoring storage Supabase aktif (alert threshold ≥ 80%)
[ ] Migrasi production pushed & diverifikasi (row count, RLS spot check)
[ ] Webhook Xendit production mengarah ke temora.id/api/billing/webhook
[ ] WA template produksi terdaftar (task 009 §7)
[ ] Sentry DSN aktif + test event masuk
[ ] Cron TTL & expiry muncul di Vercel dashboard
[ ] Backup: PITR Supabase aktif
```

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `.github/workflows/ci.yml` | baru |
| `vercel.json` | update — crons + headers keamanan dasar |
| `.env.example` | review lengkap — SSOT architecture.md §11 |
| `src/app/(legal)/privacy/page.tsx` · `terms/page.tsx` | baru — halaman statis |
| `docs/runbook.md` | baru — rollback + restore procedure |

## 6. Acceptance Criteria

- [ ] PR gagal lint/typecheck memblok merge (test dengan commit sengaja rusak lalu diperbaiki).
- [ ] Push ke `main` → production terdeploy < 10 menit, smoke test halaman utama lolos.
- [ ] Error runtime uji coba muncul di Sentry < 1 menit dengan stack trace benar.
- [ ] UptimeRobot mendeteksi downtime simulasi & kirim alert.
- [ ] Rollback ke deploy sebelumnya teruji sukses sekali (bukan cuma teori).
- [ ] Tidak ada secret di repo; `.env.example` lengkap semua variabel.

## 7. Catatan

Deployment pertama hello-world sudah dilakukan di task 001 — task ini adalah versi *production-grade*. Jangan tunggu sempurna untuk setup Sentry: pasang sejak awal, murah dan menyelamatkan debugging jam-jam malam event.

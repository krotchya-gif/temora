# Task 015 — Deployment + CI/CD + Monitoring

*Status: Prototipe live di Hostinger shared (2026-08-26); sisa = hardening produksi-grade sebelum launch · Prioritas: High · Phase: MVP (wajib sebelum launch)*

Depends on: 008, 009

---

## 1. Tujuan

Pipeline rilis yang aman dan terpantau: tiap push tervalidasi otomatis, production punya domain + monitoring + alerting, dan insiden bisa dideteksi sebelum vendor merasakannya.

> **Keputusan 2026-08-26 (prototipe)**: karena belum monetisasi, hosting memakai
> **Hostinger shared (Git deploy)** — biaya nol. Konsekuensi teknis:
> - build wajib `next build --webpack` + config `next.config.mjs` (builder
>   glibc < 2.29 tidak mendukung binary Turbopack/SWC native — vercel/next.js#96960);
> - cron via **pinger eksternal** (cron-job.org/UptimeRobot) → `architecture.md §12`.
> Sebelum launch vendor pertama, **re-evaluasi Vercel (Pro, cron native) atau
> Hostinger VPS** (`architecture.md §2`).

## 2. Scope

- **Hostinger shared — Git deploy (prototipe live)**: repo GitHub `main`
  auto-deploy ke hPanel; env vars terpasang di pengaturan Node app (semua key
  task 001 + `CRON_SECRET`). Build = `npm run build` (`--webpack`).
- **Domain** `chirpek.site` (prototipe) / `temora.id` (target produksi) + SSL hPanel.
- **GitHub Actions CI** tiap push/PR:
  - `lint` (ESLint) + `typecheck` (tsc) + `build` + unit test (`npm run test`).
  - Gagal CI = blok merge ke `main`.
- **Branching convention**: `main` = auto-deploy produksi (Hostinger polling repo).
- **Supabase production**: project terpisah dari dev; migrasi di-push via CLI
  (`supabase db push`), tidak pernah DDL manual dashboard.
- **Monitoring** (architecture.md §9):
  - Sentry — error tracking frontend + API routes.
  - UptimeRobot — ping `/api/health` tiap 5 menit.
  - Analitik web: nonaktif sementara (Vercel Analytics no-op di luar Vercel);
    aktifkan Sentry perf/alternatif saat launch.
- **Cron**: pinger eksternal memicu 4 route `/api/cron/*` dengan header
  `Authorization: Bearer $CRON_SECRET` (architecture.md §12). Schedule di
  `vercel.json` tetap ada sebagai referensi native bila pindah Vercel.
- `.env.example` diverifikasi lengkap (SSOT architecture.md §11).
- Halaman statis `/privacy` & `/terms` live (konten dasar; review hukum formal menyusul).
- Custom SMTP untuk email verifikasi Supabase.
- Runbook: rollback deploy, restore PITR, storage threshold (≥80% ≈ 800MB → upgrade Supabase Pro).

## 3. Non-Scope

- ❌ Multi-region / read replicas (scale nanti).
- ❌ Blue-green deployment.

## 4. Desain

### 4.1 Environment matrix (prototipe)
| Env | Deploy | Supabase | Domain |
|---|---|---|---|
| Prototipe | `main` → Hostinger Git | Production project | `chirpek.site` |
| (Launch) | re-eval Vercel/VPS | Production project | `temora.id` |

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
[ ] Cron TTL & expiry dipicu pinger eksternal (verifikasi hit manual)
[ ] Backup: PITR Supabase aktif
[ ] Re-evaluasi hosting: Vercel Pro (cron native) atau Hostinger VPS (architecture.md §2)
```

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `.github/workflows/ci.yml` | lint + typecheck + build + unit test (`npm run test`) |
| `package.json` | build `next build --webpack` |
| `next.config.mjs` | config JS murni (tanpa transpile SWC) |
| `vercel.json` | crons + headers keamanan (referensi native bila pindah Vercel) |
| `.env.example` | review lengkap — SSOT architecture.md §11 |
| `src/app/(legal)/privacy/page.tsx` · `terms/page.tsx` | halaman statis |
| `docs/runbook.md` | rollback + restore procedure |

## 6. Acceptance Criteria

- [x] Push ke `main` → auto-deploy Hostinger; `/api/health` 200 (live 2026-08-26, commit 6919c63).
- [ ] PR gagal lint/typecheck memblok merge (uji commit sengaja rusak lalu diperbaiki).
- [ ] Error runtime uji coba muncul di Sentry < 1 menit dengan stack trace benar.
- [ ] UptimeRobot mendeteksi downtime simulasi & kirim alert.
- [ ] Rollback ke deploy sebelumnya teruji sukses sekali (bukan cuma teori).
- [ ] Tidak ada secret di repo; `.env.example` lengkap semua variabel.

## 7. Catatan

Prototipe sudah live di Hostinger (commit 6919c63). Task ini kini menjadi
checklist hardening menuju launch: Sentry sejak awal, monitoring storage,
dan re-evaluasi hosting sebelum onboarding vendor pertama. Jangan tunggu
sempurna untuk setup Sentry — pasang sejak awal, murah dan menyelamatkan
debugging jam-jam malam event.

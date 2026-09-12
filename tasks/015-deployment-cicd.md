# Task 015 — Deployment + CI/CD + Monitoring

*Status: Prototipe live di Hostinger shared (2026-08-26); rollback teruji (owner 2026-09-12); branch protection & uptime monitor eksternal di-descope (keputusan owner 2026-09-12) · Prioritas: High · Phase: MVP (wajib sebelum launch)*

Depends on: 008, 009

---

## 1. Tujuan

Pipeline rilis yang aman dan terpantau: tiap push tervalidasi otomatis, production punya domain + monitoring + alerting, dan insiden bisa dideteksi sebelum vendor merasakannya.

> **Keputusan 2026-08-26 (prototipe)**: karena belum monetisasi, hosting memakai
> **Hostinger shared (Git deploy)** — biaya nol. Konsekuensi teknis:
> - build wajib `next build --webpack` + config `next.config.mjs` (builder
>   glibc < 2.29 tidak mendukung binary Turbopack/SWC native — vercel/next.js#96960);
> - cron via **pinger eksternal** (cron-job.org) → `architecture.md §12`.
> Sebelum launch vendor pertama, **re-evaluasi Vercel (Pro, cron native) atau
> Hostinger VPS** (`architecture.md §2`).

## 2. Scope

- **Hostinger shared — Git deploy (prototipe live)**: repo GitHub `main`
  auto-deploy ke hPanel; env vars terpasang di pengaturan Node app (semua key
  task 001 + `CRON_SECRET`). Build = `npm run build` (`--webpack`).
- **Domain produksi** `temora.site` + SSL hPanel.
- **GitHub Actions CI** tiap push/PR:
  - `lint` (ESLint) + `typecheck` (tsc) + `build` + unit test (`npm run test`).
  - CI merah wajib dibereskan sebelum merge (tanpa branch protection otomatis —
    keputusan owner 2026-09-12).
- **Branching convention**: `main` = auto-deploy produksi (Hostinger polling repo).
- **Supabase production**: project terpisah dari dev; migrasi di-push via CLI
  (`supabase db push`), tidak pernah DDL manual dashboard.
- **Monitoring** (architecture.md §9):
  - Log Node app hPanel — error tracking frontend + API routes.
  - Uptime monitor eksternal **tidak dipakai** (keputusan owner 2026-09-12);
    `/api/health` tetap tersedia untuk probe manual/CI.
  - Analitik web: nonaktif sementara (Vercel Analytics no-op di luar Vercel);
    aktifkan alternatif (mis. Web Vitals) saat launch.
- **Cron**: pinger eksternal memicu 2 route `/api/cron/*` (photo-ttl,
  subscription-expiry) dengan header `Authorization: Bearer $CRON_SECRET`
  (architecture.md §12).
- `.env.example` diverifikasi lengkap (SSOT architecture.md §11).
- Halaman statis `/privacy` & `/terms` live (konten dasar; review hukum formal menyusul).
- Custom SMTP untuk email verifikasi Supabase.
- Runbook: rollback deploy, restore PITR, storage threshold (≥80% ≈ 800MB → upgrade Supabase Pro).

## 3. Non-Scope

- ❌ Multi-region / read replicas (scale nanti).
- ❌ Blue-green deployment.

## 4. Desain

### 4.1 Environment matrix
| Env | Deploy | Supabase | Domain |
|---|---|---|---|
| Produksi aktif | `main` → Hostinger Git | Production project | `temora.site` |
| Opsi berikutnya | re-eval Vercel/VPS | Production project | `temora.site` |

Secret webhook Xendit berbeda per env — jangan pernah share.

### 4.2 Checklist go-live
```
[ ] Semua acceptance criteria tasks MVP (001–009 · 015–017) ✅
[ ] Halaman /privacy & /terms live dan terisi
[ ] Custom SMTP email verifikasi terpasang & teruji kirim-masuk
[ ] Monitoring storage Supabase aktif (alert threshold ≥ 80%)
[ ] Migrasi production pushed & diverifikasi (row count, RLS spot check)
[ ] Webhook Xendit production mengarah ke https://temora.site/api/billing/webhook
[ ] WA template produksi terdaftar (task 009 §7)
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
| `.env.example` | review lengkap — SSOT architecture.md §11 |
| `src/app/(legal)/privacy/page.tsx` · `terms/page.tsx` | halaman statis |
| `docs/runbook.md` | rollback + restore procedure |

## 6. Acceptance Criteria

- [x] Push ke `main` → auto-deploy Hostinger; `/api/health` 200 (live 2026-08-26, commit 6919c63).
- [x] Tidak ada secret di repo; `.env.example` lengkap semua variabel. *(diaudit 2026-08-28: seluruh match hanya nama variabel/komentar/SQL grant — false positive; satu-satunya file env ter-track = `.env.example`)*
- [x] Rollback ke deploy sebelumnya teruji sukses sekali — terverifikasi owner (hPanel, 2026-09-12).
- [ ] ~~PR gagal lint/typecheck memblok merge~~ — dibatalkan (keputusan owner 2026-09-12: tanpa branch protection GitHub).
- [ ] ~~UptimeRobot mendeteksi downtime simulasi & kirim alert~~ — dibatalkan (keputusan owner 2026-09-12: tanpa uptime monitor eksternal).

## 7. Catatan

Prototipe sudah live di Hostinger (commit 6919c63). Task ini kini menjadi
checklist hardening menuju launch: log hPanel sebagai error tracking utama
(Sentry tidak dipakai — keputusan 2026-08-28), monitoring storage,
dan re-evaluasi hosting sebelum onboarding vendor pertama. Pinger cron
(cron-job.org) tetap wajib untuk job TTL/expiry; uptime monitor eksternal
diputuskan tidak dipakai (2026-09-12).

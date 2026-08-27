# Task 001 — Setup Project (Next.js + Supabase + Hosting)

*Status: Selesai prototipe (2026-08-26) — health endpoint live ✓, env lengkap & valid; deploy prototipe via Hostinger Git (bukan Vercel, lihat task 015) · Prioritas: High · Phase: MVP*

---

## 1. Tujuan

Inisialisasi codebase TEMORA di **root repo** dengan Next.js 16 + Tailwind 4 + Supabase client, terdeploy (prototipe: Hostinger Git deploy, task 015), scaffold folder siap task berikutnya.

## 2. Scope

### 2.1 Bootstrap Next.js

- `create-next-app` di **root workspace** (bukan subfolder `temora/`).
- TypeScript, App Router, Tailwind CSS 4, ESLint, `src/` directory.
- Node.js **20+** (`.nvmrc` atau `engines` di `package.json`).

### 2.2 Struktur folder (architecture.md §3.0)

Buat folder kosong + placeholder minimal agar struktur konsisten sejak awal:

```
src/app/(auth)/
src/app/(legal)/
src/app/dashboard/
src/app/p/[eventId]/[tableId]/
src/app/print/[eventId]/qr/
src/app/api/
src/components/{photobooth,gallery,dashboard,ui}/
src/lib/supabase/
src/lib/validation/
public/logos/
supabase/migrations/    # kosong dulu — task 002 isi SQL
```

### 2.3 Design tokens (design-system.md §2.5)

- `@theme` block di `src/app/globals.css` — semua token warna §2.1.
- Font via `next/font/google` di `layout.tsx`: Cormorant Garamond, Plus Jakarta Sans, JetBrains Mono.
- Landing stub `/`: wordmark "TEMORA" + tagline "Keep the moments close." + token brand.
- **Tidak** buat `tailwind.config.ts` kecuali plugin wajib — Tailwind 4 cukup CSS-first.

### 2.4 Supabase init

- `npx supabase init` → `supabase/config.toml` (region **Singapore** saat link project).
- Buat project Supabase (dev), pasang env vars.
- Install `@supabase/supabase-js` + `@supabase/ssr`.
- Tiga klien sesuai architecture.md §2:

| File | Isi |
|------|-----|
| `src/lib/supabase/client.ts` | `createBrowserClient` — anon key |
| `src/lib/supabase/server.ts` | `createServerClient` — anon + cookies (vendor session) |
| `src/lib/supabase/admin.ts` | `createClient` — service role, hanya import di API routes/cron |

- Route test: `GET /api/health` → `{ ok: true, supabase: "connected" }` (query trivial via `admin` atau cek env).

### 2.5 Environment & git hygiene

- `.env.example` — salin semua var dari architecture.md §11 (nilai kosong + komentar).
- `.env.local` — gitignored, isi dev lokal.
- `.gitignore` mencakup `.env*.local`, `.vercel`, `node_modules`.

### 2.6 Deploy awal

- Connect repo GitHub → auto-deploy prototipe Hostinger (task 015); Vercel hanya opsi saat re-evaluasi launch.
- Pasang env vars preview (minimal Supabase trio + `NEXT_PUBLIC_APP_URL`).

### 2.7 Placeholder assets

- `public/logos/temora-wordmark.svg` — wordmark teks sederhana (font-display).

## 3. Non-Scope

- ❌ Skema database & migrasi SQL (task 002).
- ❌ Middleware auth / halaman login (task 003).
- ❌ Halaman selain landing stub + `/api/health`.
- ❌ CI workflow lengkap (task 015 — tapi `.env.example` sudah siap).

## 4. Desain

### 4.1 Scripts `package.json` (minimal)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

### 4.2 Landing stub

Server component, tanpa interaktivitas. Cukup validasi token CSS: `bg-bg-base`, `text-accent`, `font-display`.

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `package.json` | deps + scripts |
| `src/app/globals.css` | @theme tokens |
| `src/app/layout.tsx` | fonts + metadata dasar |
| `src/app/page.tsx` | landing stub |
| `src/app/api/health/route.ts` | health check |
| `src/lib/supabase/*.ts` | 3 klien |
| `.env.example` | daftar env §11 architecture |
| `supabase/config.toml` | init CLI |
| `public/logos/temora-wordmark.svg` | placeholder |
| `.nvmrc` atau `engines` | Node 20+ |

## 6. Acceptance Criteria

- [x] `npm run dev` + `npm run build` + `npm run lint` + `npm run typecheck` jalan tanpa error. *(terverifikasi 2026-08-26)*
- [x] Landing stub menampilkan wordmark + tagline dengan token brand (bukan hex hardcode).
- [x] `GET /api/health` return 200 + indikasi Supabase terkonfigurasi. *(terverifikasi manual 2026-08-28)*
- [x] Tiga file `src/lib/supabase/*` ada; `admin.ts` **tidak** di-import dari Client Component.
- [x] `.env.example` lengkap sesuai architecture.md §11.
- [x] Prototipe live via Hostinger Git deploy — `chirpek.site` (commit a5b01f5+, task 015).
- [x] Tidak ada secret ter-commit ke git (`git grep` key = kosong).

## 7. Catatan

- Service role key hanya lewat `admin.ts` — never expose ke browser bundle.
- Task 002 akan `supabase db push`; jangan buat tabel manual di dashboard.
- Setelah task ini selesai, lanjut task 002 (schema) → 003 (auth).

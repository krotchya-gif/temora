# Task 003 — Auth Vendor + Dashboard Shell

*Status: Ready · Prioritas: High · Phase: MVP*

Depends on: 001, 002

---

## 1. Tujuan

Vendor bisa signup/login/logout, dan dashboard punya layout shell (sidebar + header) yang dipakai semua halaman internal.

## 2. Scope

- Auth email/password via Supabase Auth (signup + konfirmasi email).
- Checkbox persetujuan Terms & Privacy di form signup — wajib centang sebelum submit.
- Halaman: `/login`, `/signup`, `/dashboard` (stub overview).
- Middleware proteksi `/dashboard/*` (redirect ke login jika belum auth).
- Session handling via cookie httpOnly (`@supabase/ssr`) — pakai `src/lib/supabase/server.ts` (bukan admin).
- Dashboard shell: sidebar responsive (drawer di mobile), header dengan nama vendor + logout.
- Empty state dashboard: "Belum ada event — buat event pertamamu." CTA ke task 007 nanti.

## 3. Non-Scope

- ❌ OAuth Google (backlog — mudah ditambah belakangan).
- ❌ CRUD events (task 007).

## 4. Desain

### 4.1 Auth flow
```
/signup → form (nama, email, password) → supabase.auth.signUp
       → email verifikasi → login → redirect /dashboard
/login  → signInWithPassword → set cookie → /dashboard
/logout → clear session → /
```

### 4.2 Middleware
Satu `middleware.ts` cek session untuk semua path `/dashboard`; refresh token otomatis oleh helper ssr.

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `middleware.ts` | baru |
| `src/app/(auth)/login/page.tsx` | baru |
| `src/app/(auth)/signup/page.tsx` | baru |
| `src/app/dashboard/layout.tsx` | baru — shell |
| `src/app/dashboard/page.tsx` | stub overview |
| `src/components/ui/*` | Button, Input, Card dasar (sesuai design-system §3) |

## 6. Acceptance Criteria

- [ ] Signup → email verifikasi → login → masuk dashboard, row `vendors` tercipta.
- [ ] Akses `/dashboard` tanpa login → redirect `/login`.
- [ ] Logout membersihkan session; back-button tidak membocorkan halaman protected.
- [ ] UI konsisten dengan design tokens (warm ivory, earthy brown, Cormorant Garamond + Plus Jakarta Sans).
- [ ] Mobile drawer sidebar berfungsi mulus di 360px viewport.

## 7. Catatan

Error auth pakai copy human ("Email atau kata sandi belum pas"), bukan pesan teknis mentah.

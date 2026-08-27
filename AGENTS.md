# AGENTS.md — Aturan Kerja Agent di Repo TEMORA

> File ini **bukan** sumber kebenaran kedua. Ia hanya router: semua keputusan produk, desain, skema, dan arsitektur hidup di satu tempat — folder `docs/`.

## 1. Aturan Utama: Single Source of Truth

1. **`docs/` adalah satu-satunya sumber kebenaran.** Jika ada konflik antara memori percakapan lama, asumsi, draft lama (`temora/`, `temora-project-files/` — arsip, jangan dibaca sebagai acuan), atau kode existing vs `docs/` → **`docs/` yang menang**.
2. **Jangan pernah mengambil keputusan desain/skema/bisnis tanpa menuliskannya di `docs/` lebih dulu.** Alur wajib: putuskan → update doc terkait → baru tulis kode. (README §Urutan Kerja #4.)
3. **Satu topik = satu dokumen pemilik.** Jangan menduplikasi konten antar-dokumen; cukup referensi silang. Jika butuh fakta, baca dokumen pemiliknya:

| Topik | Pemilik (SSOT) |
|---|---|
| Brand, voice, tagline, SEO | `docs/BRAND.md` |
| Visi, fitur MoSCoW, metrik, risiko | `docs/PRD.md` |
| Stack, routes, data flow, env vars, cron, AI ref | `docs/architecture.md` |
| Token warna/font, komponen, motion, microcopy | `docs/design-system.md` |
| Skema DB, RLS, storage, retention | `docs/database.md` |
| Riset kompetitor | `docs/research/competitor-analysis.md` |
| Keputusan final & terkunci | `README.md` §Keputusan Terkunci |

4. **Dokumen tidak ada di daftar itu? Berarti belum ada keputusannya** — tanyakan atau usulkan update docs dulu, jangan mengarang.
5. **Implementasi wajib setia pada desain yang tertulis.** Jika `docs/`/task menentukan metode A, kerjakan metode A **sampai benar-benar tuntas** — dilarang diam-diam memakai "metode B/C", shortcut, stub, atau workaround lain lalu melaporkannya sebagai selesai. Jika metode yang ditulis ternyata tidak memungkinkan: **stop** → ajukan perubahan ke `docs/` → tunggu keputusan & doc diupdate → baru lanjut dengan cara yang baru disetujui.

## 2. Urutan Kerja Eksekusi

1. Baca `docs/PRD.md`, lalu docs lain sesuai task yang dikerjakan.
2. Kerjakan `tasks/001` → `tasks/017` **berurutan** (018–019 = MVP+ alat operasional, dikerjakan setelah 017). Jangan loncat; tiap task punya acceptance criteria — semua checklist harus ✅ sebelum lanjut.
3. **Launch gate**: 015–017 wajib tuntas sebelum vendor pertama onboarding.
4. Desain berubah saat pengerjaan? **Update `docs/` dulu, commit bersama kode** — tidak boleh ada kode yang menyimpang dari docs.

## 3. Hal yang Tidak Boleh Diganggu (Locked)

- Daftar lengkap: `README.md` §Keputusan Terkunci — nama brand TEMORA, Xendit, WA di MVP, tipografi Cormorant Garamond + Plus Jakarta Sans, token warna kanonik, tanpa facial recognition, tabel Phase 2+ tidak dibuat sebelum waktunya.
- Jangan membuat tabel `moments`/`sponsors`, fitur Phase 2/3, atau halaman apapun di luar scope task aktif.
- Anti-pattern RLS yang dilarang keras: policy `USING(true)` pada photos/guests — lihat warning di `docs/database.md` §4.

## 4. Aturan Keras Saat Menulis Kode

1. **Warna/hex hanya lewat token** design-system §2.1 — dilarang hardcode hex baru; warna baru = update docs dulu.
2. **Microcopy dari tabel** design-system §6 (Bahasa Indonesia, brand voice hangat).
3. Luluskan **Anti-Slop Gate** design-system §11 sebelum deliver UI apa pun.
4. **RLS adalah guard pertama, API route guard kedua** (defense in depth) — limit tier/foto dicek di keduanya.
5. **Service role key hanya di API routes/server**, never client.
6. Migrasi DB hanya via file `supabase/migrations/` (CLI) — tidak ada DDL manual dashboard; migration applied tidak boleh diedit.
7. Secret hanya via `.env` — tidak ada key di kode/git.
8. Mobile-first: `min-h-dvh` (bukan `min-h-screen`), cek viewport 360px, `prefers-reduced-motion` didukung.

## 5. Verifikasi Selesai Task

- **"Selesai" = berfungsi penuh sesuai desain di `docs/`** — bukan jalan sebagian, stub sementara, atau versi alternatif penyimpangan dari metode yang ditentukan.
- Jalankan lint + typecheck + build sebelum klaim task tuntas (pipeline CI task 015 adalah standar minimal).
- Setiap item acceptance criteria di task aktif harus benar-benar teruji/demokan — jangan mencentang berdasar asumsi.
- Temuan desain baru saat koding → catat & update docs dalam commit yang sama.

---

*Inkonsistensi antara file ini dan `README.md`/`docs/` → yang di `docs/` yang benar; laporkan agar file ini dirapikan.*

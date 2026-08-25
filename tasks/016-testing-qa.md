# Task 016 — Testing & QA (Pre-Launch Gate)

*Status: Ready · Prioritas: High · Phase: MVP (wajib sebelum launch)*

Depends on: 015 (CI pipeline aktif agar test jalan otomatis)

---

## 1. Tujuan

Semua alur inti teruji end-to-end di device nyata sebelum vendor pertama dipakai. Event sungguhan tidak boleh jadi tempat testing.

## 2. Scope

- **Unit tests** (Vitest): util kompresi canvas, validasi zod, helper xendit signature verify, normalisasi nomor WA E.164.
- **E2E tests** (Playwright) — 3 jalur kritis:
  - Tamu: scan QR → consent → capture (mock kamera) → upload → simpan/bagikan.
  - Vendor: signup → buat event → upload frame → generate QR → lihat galeri.
  - Billing: checkout sandbox Xendit → webhook paid → tier naik.
- **Device lab manual** (wajib, tidak bisa di-automasi penuh):
  - Android Chrome mid-range + iPhone Safari (iOS ≥ 16) — kamera, izin, upload, orientasi.
  - Print kartu QR: A4 rapi di Chrome & Safari.
- **Performance**: Lighthouse mobile ≥ 85 di `/p/[eventId]/[tableId]` dan landing; audit bundle photobooth (AI chunk terpisah).
- **Accessibility**: keyboard nav dashboard, screen reader spot check halaman utama, kontras token (design-system §9).
- **Security QA**: RLS cross-tenant test (vendor A vs B), webhook replay, anon tidak bisa baca foto, `client_upload_id` dedup.
- **Bug bash**: sesi cari-cari bug 1 jam → daftar triase (fix sekarang / backlog / won't fix).

## 3. Non-Scope

- ❌ Load testing ribuan concurrent (skala MVP belum perlu — catat sebagai pre-growth task).
- ❌ Penetration test eksternal berbayar (evaluasi pasca revenue).

## 4. Desain

### 4.1 Definisi "lulus"
| Kategori | Gate |
|---|---|
| E2E jalur kritis | 3/3 hijau di CI |
| Device lab | Semua checklist device lolos tanpa bug blocker |
| Lighthouse | ≥ 85 mobile photobooth |
| Bug | 0 blocker, 0 critical terbuka |

### 4.2 Bug severity
- **Blocker** — alur inti mati (capture gagal, ZIP korup, bayar tak naik tier) → fix sekarang.
- **Critical** — data salah/bocor tapi ada workaround → fix sekarang.
- **Major/Minor** — boleh masuk backlog dengan catatan.

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `vitest.config.ts` + `tests/unit/**` | baru |
| `playwright.config.ts` + `tests/e2e/**` | baru |
| `.github/workflows/ci.yml` | tambah job unit + e2e |
| `docs/qa-report.md` | baru — hasil device lab + bug bash |

## 6. Acceptance Criteria

- [ ] Unit tests lulus di CI; coverage util inti > 80%.
- [ ] 3 jalur E2E hijau konsisten 2x run berturut-turut.
- [ ] Capture sukses di Android mid-range + iPhone Safari fisik (bukan cuma emulator).
- [ ] Lighthouse mobile ≥ 85 photobooth; hasil terlampir di qa-report.
- [ ] Cross-tenant RLS test: semua percobaan akses lintas vendor ditolak.
- [ ] Webhook replay tidak menduplikasi efek (regression dari task 008).
- [ ] qa-report.md final: semua blocker/critical closed.

## 7. Catatan

E2E kamera memakai fake media stream Chromium (`--use-fake-ui-for-media-stream`); kepercayaan akhir tetap pada device lab manual — Playwright tidak menggantikan uji iOS Safari. Setelah task ini: siap launch 🚀

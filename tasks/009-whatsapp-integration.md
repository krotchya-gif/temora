# Task 009 — WhatsApp Integration

*Status: Kode selesai · webhook kini verifikasi signature x-hub-signature-256 fail-closed (401 tanpa signature, terverifikasi live); kirim WA nyata menunggu WHATSAPP_TOKEN; sisa AC masuk E2E task 016 · Prioritas: High · Phase: MVP*

Depends on: 003, 008

---

## 1. Tujuan

Notifikasi WhatsApp ke vendor untuk momen penting + alur aktivasi akun yang dibantu admin via WhatsApp (sesuai keputusan MVP).

## 2. Scope

- Wrapper WhatsApp Business Cloud API (`src/lib/whatsapp.ts`): send template text, retry 1x, log semua ke `whatsapp_logs`.
- Trigger notifikasi:
  | Kind | Trigger | Contoh copy |
  |---|---|---|
  | `welcome` | Vendor pertama kali verified | "Halo {name}! Selamat datang di TEMORA 👋 ..." |
  | `event_created` | Event baru dibuat | "...Event '{name}' siap. Bagikan QR meja-nya ya!" |
  | `photo_milestone` | 50 / 100 foto tercapai (throttled) | "{n} momen terkumpul di {event}. Mulai unduh?" |
  | `invoice` | Invoice dibuat | link pembayaran Xendit |
  | `payment_ok` | Webhook paid | "Pembayaran diterima. Tier {tier} aktif 🎉" |
  | `expiry_reminder` | Subscription mendekati kadaluarsa (H-3/H-0 via cron, task 008) | "Masa aktif {tier} kamu berakhir {n} hari lagi. Perpanjang di sini ya: {link}" |
- Halaman `/dashboard/settings`: input nomor WA + opt-in toggle (default on).
- Aktivasi manual via admin: halaman landing punya CTA `wa.me` deep-link ke nomor admin dengan pre-filled text (pola Invrame, tapi dibakukan).
- Throttle & quiet hours: max 3 pesan/hari/vendor, tidak kirim 22:00–07:00 WIB (queue).

## 3. Non-Scope

- ❌ Two-way chat bot WA (backlog).
- ❌ Kirim foto via WA (backlog — biaya & kompleksitas tinggi).

## 4. Desain

### 4.1 Enqueue pattern
Semua notifikasi masuk via helper `enqueueWa(vendorId, kind, payload)` → insert `whatsapp_logs` status `queued` → kirim async (fire-and-forget dari API route; worker sederhana via cron fallback tiap 5 menit untuk queued yang gagal).

### 4.2 Phone validation
Normalisasi ke E.164 (62…). Invalid → tandai log failed + surface warning di dashboard settings.

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `src/lib/whatsapp.ts` | baru |
| `src/app/api/whatsapp/webhook/route.ts` | stub delivery status |
| `src/app/api/cron/wa-queue/route.ts` | retry queued (§12 architecture) |
| `src/app/dashboard/settings/page.tsx` | phone + opt-in |
| Hook calls di routes events/billing | enqueue points |

## 6. Acceptance Criteria

- [ ] Semua 6 trigger terkirim ke nomor test nyata.
- [ ] Log tercatat lengkap (queued/sent/failed + error).
- [ ] Quiet hours: pesan malam masuk queue, terkirim pagi.
- [ ] Opt-out menghentikan semua pesan non-kritis (payment_ok tetap terkirim).
- [ ] Nomor invalid ditolak dengan pesan jelas di settings.

## 7. Catatan

Gunakan template text biasa dulu (bukan template approved Meta) selama masih kirim dari nomor test/sandbox; produksi wajib daftar template agar dapat header & format.

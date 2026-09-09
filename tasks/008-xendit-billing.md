# Task 008 — Xendit Billing (Tier + Invoice + Webhook)

*Status: Ready · Prioritas: High · Phase: MVP*

Depends on: 003, 007

---

## 1. Tujuan

Monetisasi end-to-end: vendor upgrade tier → bayar via Xendit → tier aktif otomatis setelah webhook konfirmasi.

## 2. Scope

- Halaman `/dashboard/billing`: tier saat ini, perbandingan paket, riwayat invoice.
- Pricing (terkunci di PRD):
  - Free — Rp 0 · 1 event aktif · 100 foto/event.
  - Basic — Rp 49K/bln · 3 event aktif · 500 foto/event.
  - Pro — Rp 299K/bln · unlimited event · unlimited foto + custom watermark atau tanpa watermark.
- `POST /api/billing/checkout`: create Xendit invoice → simpan row `subscriptions` (pending) → redirect ke payment URL.
- `POST /api/billing/webhook`: verifikasi Xendit callback token → update subscription `paid` + naikkan `vendors.subscription_tier` → trigger WA notif (hook ke task 009).
- Idempotent webhook (cek `xendit_invoice_id` unik).
- Renewal reminder: job harian cek `period_end` H-3 dan H-0 → enqueue WA `expiry_reminder` + payment link perpanjangan (reuse checkout). Lewat tanpa bayar → tier turun free (perilaku existing).
- Downgrade/expiry ke Free: event aktif **tetap jalan**; vendor tidak bisa create/activate event baru sampai ≤1 aktif (nonaktifkan manual). Lihat database.md §2.7.
- Cron harian: cek `period_end` lewat → tandai subscription expired + turunkan `vendors.subscription_tier` ke free.

## 3. Non-Scope

- ❌ Prorated refund / pembatalan mid-period (backlog).
- ❌ Payment QRIS manual admin (tidak perlu — Xendit handle semua metode).

## 4. Desain

### 4.1 Webhook flow

```
Xendit POST → verify x-callback-token
  → cari subscriptions by xendit_invoice_id
  → jika PAID & belum diproses:
      status=paid, period_start=now, period_end=+30d
      vendors.subscription_tier = tier
      enqueue WA "payment_ok"
  → respond 200 cepat (<3s); proses berat async
```

### 4.2 Enforcement point
Limit event/foto dicek server-side di API events & upload route — baca tier dari DB, bukan dari client. `photo_limit` per event diset saat create (database.md §2.7), tidak di-sync ulang saat upgrade.

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `src/app/dashboard/billing/page.tsx` | baru |
| `src/app/api/billing/checkout/route.ts` | baru |
| `src/app/api/billing/webhook/route.ts` | baru |
| `src/lib/xendit.ts` | baru — client wrapper + signature verify |
| `src/app/api/cron/subscription-expiry/route.ts` | baru |
| `src/app/api/cron/wa-reminders/route.ts` | baru — H-3/H-0 |
| `vercel.json` | cron §12 (referensi; dieksekusi pinger eksternal — architecture.md §12) |

## 6. Acceptance Criteria

- [ ] Sandbox Xendit: invoice dibuat, bayar simulasi → webhook masuk → tier naik otomatis.
- [ ] Replay webhook yang sama tidak menduplikasi efek (idempotent).
- [ ] Callback token invalid → 401, tanpa side effect.
- [ ] Tier free terblokir bikin event kedua; setelah upgrade langsung bisa.
- [ ] Riwayat invoice tampil rapi di dashboard.
- [ ] Expiry cron: subscription lewat `period_end` → tier turun ke free + WA notif.
- [ ] Reminder WA `expiry_reminder` terkirim H-3 dan H-0 sebelum expiry; quiet hours tetap berlaku.

## 7. Catatan

Secret webhook token di env (`XENDIT_WEBHOOK_TOKEN`). Jangan pernah trust payload tanpa verifikasi — log semua callback mentah ke tabel log untuk audit.

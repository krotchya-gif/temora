# Task 014 — Analytics Dashboard

*Status: Ready · Prioritas: Medium · Phase: 3*

Depends on: 006, 008

---

## 1. Tujuan

Vendor memahami performa event lewat angka: engagement tamu, jam sibuk, distribusi meja — bahan laporan ke klien akhir (corporate/WO) dan alasan renewal subscription.

## 2. Scope

- Halaman `/dashboard/events/[eventId]/analytics` dengan metrik:
  - **Metrik utama (north star)**: download rate ZIP + jumlah foto terunduh — proxy "moments kept".
  - Total foto, foto per meja, scan count per meja.
  - Heatmap jam: foto per jam sepanjang event (`taken_at` histogram).
  - Top 3 meja paling aktif.
  - Rata-rata foto/menit selama event berjalan.
- Chart.js (`chart.js` + `react-chartjs-2`) — bar chart per meja, line/heat per jam.
- Query SQL agregat murni via RPC Postgres (no extra service), cache server 60 detik.
- Export ringkas: print stylesheet → vendor save-as-PDF untuk lampiran laporan klien.
- Privasi by design: hanya agregat, tanpa data personal tamu (tidak ada fingerprint/device tracking di level ini).

## 3. Non-Scope

- ❌ Realtime analytics (refresh manual / interval 60s cukup).
- ❌ Perbandingan antar-event di MVP analytics.
- ❌ Funnel konversi detail (scan → buka → foto) — butuh event tracking table; backlog.

## 4. Desain

### 4.1 RPC agregat
```sql
CREATE OR REPLACE FUNCTION event_analytics(p_event_id uuid)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_build_object(
    'total_photos',   (SELECT COUNT(*) FROM photos WHERE event_id = p_event_id AND deleted_at IS NULL),
    'photos_by_table',(SELECT json_object_agg(t.label, COALESCE(p.cnt,0))
                       FROM tables t LEFT JOIN
                         (SELECT table_id, COUNT(*) cnt FROM photos
                          WHERE event_id = p_event_id GROUP BY table_id) p ON p.table_id = t.id
                       WHERE t.event_id = p_event_id),
    'photos_by_hour', (SELECT json_object_agg(EXTRACT(HOUR FROM taken_at)::text, c)
                       FROM (SELECT taken_at, COUNT(*) c FROM photos
                             WHERE event_id = p_event_id GROUP BY 1) h),
    'zip_downloads',  (SELECT COUNT(*) FROM subscriptions WHERE false) -- placeholder; sumber log ZIP di task impl
  );
$$;
```
> Detail final (termasuk sumber data download rate) ditentukan saat implementasi — log aksi ZIP perlu dicatat mulai task ini.

### 4.2 Prinsip UI
- Angka besar font-mono di atas, chart di bawah; tanpa pie chart 3D dsb.
- Copy insight hangat: *"Jam 19.00 jadi puncak momen malam ini — 84 momen terabadikan."*
- Empty state: *"Belum ada data. Bagikan QR code-nya dulu, ya."*

## 5. File yang Terlibat

| File | Perubahan |
|---|---|
| `supabase/migrations/0012_analytics.sql` | baru — RPC + tabel zip_logs ringan |
| `src/app/dashboard/events/[eventId]/analytics/page.tsx` | baru |
| `src/components/analytics/*.tsx` | baru — chart wrappers |
| `src/app/api/events/[id]/analytics/route.ts` | baru — cache 60s |

## 6. Acceptance Criteria

- [ ] Angka cocok dengan query manual SQL (spot check 3 metrik).
- [ ] Halaman < 2s load untuk event 500+ foto (cache bekerja).
- [ ] Heatmap jam & top meja akurat terhadap data seed dummy.
- [ ] Tidak ada data personal tamu di response API (audit payload).
- [ ] Print stylesheet menghasilkan PDF rapi 1–2 halaman.

## 7. Catatan

North star PRD: download/share rate > jumlah foto mentah. Tampilkan itu sebagai metrik hero — bukan vanity metric. Jangan track device fingerprint tanpa dasar hukum; agregat meja/jam sudah cukup untuk laporan vendor.

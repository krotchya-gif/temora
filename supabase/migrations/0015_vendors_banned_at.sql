-- 0015_vendors_banned_at — ban/unban vendor oleh superadmin (task 019).
-- NULL = aktif. Ban menolak login & memblokir sesi di guard berikutnya;
-- penonaktifan event dilakukan app layer (task 019 §2.12).

alter table public.vendors add column if not exists banned_at timestamptz;

create index if not exists idx_vendors_banned
  on public.vendors(banned_at) where banned_at is not null;

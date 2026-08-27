-- 0022_moments_sponsors.sql — Fase 2/3 aktif (task 012 Moments, task 013 Sponsors)
-- Keputusan terkunci #9 diperbarui 2026-08-28: tabel fase 2 dibuat saat task dieksekusi.

-- ---------- Moments (task 012): caption + guestbook digital ----------

create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  table_id uuid references public.tables(id) on delete set null,
  photo_id uuid references public.photos(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 280),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_moments_event_time
  on public.moments (event_id, created_at desc);
create index if not exists idx_moments_event_hidden
  on public.moments (event_id) where is_hidden = false;

alter table public.moments enable row level security;

-- Tamu tulis (guard cadangan — jalur utama API route service role)
create policy m_public_insert on public.moments
  for insert to anon
  with check (private.can_guest_upload(event_id));

-- Vendor baca/kelola moments eventnya (tamu TIDAK bisa baca — privasi)
create policy m_owner_all on public.moments
  for all to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.vendor_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.vendor_id = (select auth.uid())
    )
  );

alter publication supabase_realtime add table public.moments;

-- ---------- Sponsors (task 013): logo partner di frame & kartu QR ----------

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  logo_path text,
  position text not null check (position in ('frame','qr')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_sponsors_event
  on public.sponsors (event_id, is_active);

alter table public.sponsors enable row level security;

-- Baca publik hanya baris aktif (consent screen + kartu QR)
create policy sp_public_read on public.sponsors
  for select to anon, authenticated
  using (is_active = true);

-- Vendor kelola sponsor eventnya
create policy sp_owner_all on public.sponsors
  for all to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.vendor_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.vendor_id = (select auth.uid())
    )
  );

-- Bucket publik untuk logo sponsor
insert into storage.buckets (id, name, public)
values ('sponsors', 'sponsors', true)
on conflict (id) do nothing;

create policy sp_storage_public_read on storage.objects
  for select using (bucket_id = 'sponsors');

-- Vendor upload logo ke bucket sponsors (hanya pemilik event — dicek via RLS events)
create policy sp_storage_vendor_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sponsors'
    and exists (
      select 1 from public.events e
      where e.id::text = (storage.foldername(name))[1]
        and e.vendor_id = (select auth.uid())
    )
  );
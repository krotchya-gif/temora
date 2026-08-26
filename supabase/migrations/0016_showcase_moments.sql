-- 0016_showcase_moments — galeri kurasi platform (todo.md root).
-- Konten eksklusif input superadmin (bukan foto tamu vendor — privasi #8).
-- Dipakai: rope landing (24 terbaru) & halaman publik /moments.

create table public.showcase_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,          -- bucket publik 'showcase'
  title text not null,                 -- label acara/kota
  caption text,                        -- kutipan singkat opsional
  sort_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_showcase_order
  on public.showcase_photos(sort_order, created_at desc);

alter table public.showcase_photos enable row level security;

-- Publik hanya melihat konten aktif; soft-delete tersembunyi di level RLS.
create policy s_public_read on public.showcase_photos
  for select to anon, authenticated
  using (deleted_at is null);
-- Tanpa policy INSERT/UPDATE/DELETE → mutasi eksklusif service role (API admin).

insert into storage.buckets (id, name, public)
values ('showcase', 'showcase', true)
on conflict (id) do nothing;

drop policy if exists "public read showcase" on storage.objects;
create policy "public read showcase" on storage.objects
  for select
  using (bucket_id = 'showcase');

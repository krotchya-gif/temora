-- 0008_storage — bucket + akses (database.md §6)
-- photos & zips PRIVATE: objek diakses lewat signed URL yang dibuat server-side
-- (tamu tidak boleh fetch foto siapa pun langsung). thumbs & frames publik untuk grid/halaman tamu.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('thumbs', 'thumbs', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('frames', 'frames', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('zips', 'zips', false)
on conflict (id) do nothing;

-- Public read hanya untuk bucket publik; insert via service role (bypass RLS).
drop policy if exists "public read thumbs frames" on storage.objects;
create policy "public read thumbs frames" on storage.objects
  for select
  using (bucket_id in ('thumbs', 'frames'));

-- Path convention (database.md §6):
--   photos/{event_id}/{table_id}/{ulid}.jpg
--   thumbs/{event_id}/{ulid}_320.jpg
--   frames/{vendor_id}/{event_id}/frame.png
--   zips/{event_id}/temora-{slug}.zip

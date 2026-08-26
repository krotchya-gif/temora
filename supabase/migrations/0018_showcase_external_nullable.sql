-- 0018_showcase_external_nullable — baris eksternal (Unsplash/Wikimedia/picsum)
-- tidak punya objek storage; minimal salah satu sumber harus ada (todo.md).

alter table public.showcase_photos
  alter column storage_path drop not null;

alter table public.showcase_photos
  add constraint showcase_source_check
  check (storage_path is not null or external_url is not null);

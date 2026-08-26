-- 0017_showcase_external_url — dukungan foto placeholder/kurasi via URL
-- eksternal (Unsplash/Wikimedia/picsum) tanpa objek storage (todo.md).

alter table public.showcase_photos
  add column if not exists external_url text;

-- 0004_tables_photos — database.md §2.3 & §2.4
create table public.tables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  label text not null,                 -- "Meja 1", "Table A", dst
  scan_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, label)
);

create index idx_tables_event on public.tables(event_id);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  table_id uuid references public.tables(id) on delete set null,
  storage_path text not null,          -- path di bucket 'photos'
  thumb_path text,                     -- versi kecil untuk grid
  width int,
  height int,
  size_bytes int,
  metadata jsonb not null default '{}', -- capture_token + client_upload_id (dedup retry offline)
  guest_saved_at timestamptz,          -- tamu menekan Simpan/Bagikan (north star, PRD §4)
  deleted_at timestamptz,              -- soft delete (hard delete oleh cron 30 hari)
  taken_at timestamptz not null default now()
);

create index idx_photos_event_time on public.photos(event_id, taken_at desc);

-- Dedup retry offline: satu client_upload_id hanya boleh menghasilkan satu foto.
create unique index idx_photos_client_upload on public.photos ((metadata->>'client_upload_id'))
  where metadata->>'client_upload_id' is not null;

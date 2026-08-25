-- 0003_events — database.md §2.2
create table public.events (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null,
  slug text unique not null,           -- URL publik custom (alias UUID); immutable
  theme text check (theme in ('wedding','birthday','corporate','community','other')),
  starts_at timestamptz,
  ends_at timestamptz,                 -- informasi saja; tidak memblokir akses tamu
  location text,
  frame_url text,                      -- PNG transparan di Storage
  watermark_text text default 'Keep it close. Keep it TEMORA.',
  is_active boolean not null default true,
  -- TTL foto; diset app layer saat create (default NOW()+30 hari), tanpa DB default
  expires_at timestamptz,
  photo_limit int default 100,         -- diset saat create dari tier; NULL = unlimited (Pro)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slug_format check (slug ~ '^[a-z0-9-]{6,60}$')
);

create index idx_events_vendor on public.events(vendor_id);

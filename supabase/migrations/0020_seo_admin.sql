-- 0020_seo_admin — pengaturan SEO/analytics/marketing level-admin.
-- Basis desain: docs/research/seo-admin-reference.md (adaptasi TEMORA, pola KV existing).
-- Kunci: key NON-rahasia di platform_settings (publik-safe, feed halaman publik);
-- rahasia (service account GA) di tabel terpisah admin_secrets TANPA public read.

-- 1. Key publik baru di platform_settings.
insert into public.platform_settings (key, value) values
  ('seo_title', ''),
  ('seo_description', ''),
  ('seo_keywords', ''),
  ('seo_og_image', ''),
  ('robots_content', ''),
  ('sitemap_content', ''),
  ('ai_crawlers_block', ''),
  ('geo_lat', ''),
  ('geo_lng', ''),
  ('tracking_ga4_id', ''),
  ('tracking_gtm_id', ''),
  ('tracking_clarity_id', ''),
  ('tracking_pixel_id', ''),
  ('tracking_ads_id', ''),
  ('tracking_tiktok_id', ''),
  ('gsc_verification', '')
on conflict (key) do nothing;

-- 2. admin_secrets — rahasia (mis. JSON service account GA4/GSC).
-- RLS aktif TANPA policy → hanya service role (bypass RLS) / API superadmin.
-- DILARANG pakai USING(true) di sini (database.md §4).
create table if not exists public.admin_secrets (
  key text primary key,
  value text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.admin_secrets enable row level security;

-- 3. event_logs — event konversi marketing (wa_click, upgrade_click, payment_success).
-- Anon hanya INSERT (status terkunci 'pending'); read/update eksklusif superadmin.
create table if not exists public.event_logs (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  label text not null,
  page text,
  value jsonb,
  status text not null default 'pending',
  provider text,
  created_at timestamptz not null default now()
);

alter table public.event_logs enable row level security;

create policy el_public_insert on public.event_logs
  for insert to anon, authenticated
  with check (status = 'pending');

-- 4. utm_visits — pelacak kunjungan kampanye (?utm_*). Anon insert-only.
create table if not exists public.utm_visits (
  id uuid primary key default gen_random_uuid(),
  utm_source text not null,
  utm_medium text,
  utm_campaign text,
  landing_url text,
  referrer text,
  session_id text,
  created_at timestamptz not null default now()
);

alter table public.utm_visits enable row level security;

create policy uv_public_insert on public.utm_visits
  for insert to anon, authenticated
  with check (true);

-- 5. Konversi kampanye per vendor (adaptasi join orders.utm_source → subscriptions).
alter table public.subscriptions add column if not exists utm_source text;

create index if not exists idx_event_logs_created_at on public.event_logs (created_at desc);
create index if not exists idx_utm_visits_created_at on public.utm_visits (created_at desc);
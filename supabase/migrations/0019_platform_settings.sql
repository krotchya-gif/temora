-- 0019_platform_settings — pengaturan platform level-admin (KV).
-- Awalnya untuk URL sosial media footer; ekstensibel untuk setting lain.
-- Read publik memang disengaja: nilai ini justru untuk halaman publik
-- (ikon sosial) — bukan pola USING(true) pada data sensitif seperti photos.

create table public.platform_settings (
  key text primary key,
  value text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

create policy ps_public_read on public.platform_settings
  for select to anon, authenticated
  using (true);
-- Tanpa policy tulis → mutasi eksklusif service role (API admin superadmin).

insert into public.platform_settings (key, value) values
  ('social_instagram', ''),
  ('social_tiktok', ''),
  ('social_facebook', '')
on conflict (key) do nothing;

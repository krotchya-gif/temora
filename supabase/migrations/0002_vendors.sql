-- 0002_vendors — database.md §2.1
-- id = auth.users.id (disinkronkan trigger on_auth_user_created, lihat 0006).
-- Tanpa kolom password: auth ditangani penuh Supabase Auth.
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  company_name text,
  phone text,                          -- E.164, dipakai WhatsApp notif
  subscription_tier text not null default 'free'
      check (subscription_tier in ('free','basic','pro')),
  xendit_customer_id text,
  wa_opt_in boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

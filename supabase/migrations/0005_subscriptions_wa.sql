-- 0005_subscriptions_wa — database.md §2.5 & §2.6
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  tier text not null check (tier in ('basic','pro')),
  amount_idr int not null,             -- harga terkunci saat transaksi
  status text not null default 'pending'
      check (status in ('pending','paid','expired','failed')),
  xendit_invoice_id text unique,       -- unik = idempotency webhook
  xendit_payment_url text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now()
);

create index idx_subs_vendor on public.subscriptions(vendor_id);

create table public.whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  kind text not null check (kind in ('welcome','event_created','photo_milestone','invoice','payment_ok','expiry_reminder')),
  payload jsonb not null default '{}',
  status text not null default 'queued' check (status in ('queued','sent','failed')),
  error text,
  created_at timestamptz not null default now()
);

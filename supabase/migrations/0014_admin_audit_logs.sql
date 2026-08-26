-- 0014_admin_audit_logs — jejak audit aksi admin (task 019, database.md §2.6b).
-- Append-only: ditulis service role dari API admin; tanpa policy
-- INSERT/UPDATE/DELETE untuk role biasa (immutable). Read khusus superadmin.

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  actor_email text not null,           -- snapshot; tahan bila akun terhapus nanti
  action text not null,                -- set_tier | edit_vendor | ban_vendor |
                                       -- unban_vendor | delete_vendor |
                                       -- set_event_status | delete_photo
  target_type text not null,           -- vendor | event | photo
  target_id text,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_audit_time on public.admin_audit_logs(created_at desc);
create index idx_audit_target on public.admin_audit_logs(target_type, target_id);

alter table public.admin_audit_logs enable row level security;

create policy a_superadmin_read on public.admin_audit_logs
  for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- 0013_advisors_hardening — perbaikan temuan Supabase Advisors (security & performance).
-- 1. can_guest_upload dipindah ke schema `private` (tidak terekspos PostgREST,
--    tetap dipakai evaluator policy p_guest_insert).
-- 2. search_path dikunci pada touch_updated_at & handle_new_vendor.
-- 3. handle_new_vendor tidak bisa dipanggil via RPC (trigger saja).
-- 4. Policy owner dibatasi ke role authenticated + auth.uid() dibungkus
--    (select ...) agar jadi initPlan (menghilangkan multiple-permissive & re-evaluasi per baris).
-- 5. Index penutup FK: photos.table_id, whatsapp_logs.vendor_id.

create schema if not exists private;

create or replace function private.can_guest_upload(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and e.is_active
      and (e.expires_at is null or e.expires_at > now())
      and (
        e.photo_limit is null
        or (select count(*) from public.photos ph
            where ph.event_id = e.id and ph.deleted_at is null) < e.photo_limit
      )
  );
$$;

revoke all on function private.can_guest_upload(uuid) from public;
grant execute on function private.can_guest_upload(uuid)
  to anon, authenticated, service_role;

-- Urutan penting: lepas policy lama dulu (dependen ke fungsi publik),
-- baru drop fungsinya.
drop policy if exists p_guest_insert on public.photos;
drop function if exists public.can_guest_upload(uuid);

create policy p_guest_insert on public.photos for insert to anon
  with check (private.can_guest_upload(event_id));

create or replace function public.touch_updated_at() returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.handle_new_vendor() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.vendors (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', 'Vendor'));
  return new;
end $$;

revoke execute on function public.handle_new_vendor()
  from public, anon, authenticated;

drop policy if exists v_self on public.vendors;
create policy v_self on public.vendors for all to authenticated
  using ((select auth.uid()) = id);

drop policy if exists e_owner on public.events;
create policy e_owner on public.events for all to authenticated
  using ((select auth.uid()) = vendor_id);

drop policy if exists t_owner_all on public.tables;
create policy "t_owner_all" on public.tables for all to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id and e.vendor_id = (select auth.uid())
  ));

drop policy if exists p_owner_all on public.photos;
create policy p_owner_all on public.photos for all to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id and e.vendor_id = (select auth.uid())
  ));

drop policy if exists s_owner on public.subscriptions;
create policy s_owner on public.subscriptions for all to authenticated
  using ((select auth.uid()) = vendor_id);

drop policy if exists w_owner on public.whatsapp_logs;
create policy w_owner on public.whatsapp_logs for all to authenticated
  using ((select auth.uid()) = vendor_id);

create index if not exists idx_photos_table on public.photos(table_id);
create index if not exists idx_wa_logs_vendor on public.whatsapp_logs(vendor_id);

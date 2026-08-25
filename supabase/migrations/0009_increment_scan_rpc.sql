-- 0009_increment_scan_rpc — increment scan_count secara atomik (task 004).
-- Beberapa tamu di meja yang sama bisa membuka halaman bersamaan;
-- read-then-write dari API route akan saling menimpa (lost update).

create or replace function public.increment_scan_count(p_table_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.tables t
  set scan_count = t.scan_count + 1
  where t.id = p_table_id
    and exists (
      select 1 from public.events e
      where e.id = t.event_id
        and e.is_active
        and (e.expires_at is null or e.expires_at > now())
    );
$$;

-- Hanya service role (API route) yang boleh memanggil.
revoke execute on function public.increment_scan_count(uuid) from public;
revoke execute on function public.increment_scan_count(uuid) from anon;
revoke execute on function public.increment_scan_count(uuid) from authenticated;
grant execute on function public.increment_scan_count(uuid) to service_role;

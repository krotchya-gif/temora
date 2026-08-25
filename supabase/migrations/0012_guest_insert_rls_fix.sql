-- 0012_guest_insert_rls_fix — perbaikan infinite recursion pada p_guest_insert.
-- Policy lama menghitung foto lewat subquery ke tabel photos itu sendiri;
-- Postgres menolak dengan 42P17 "infinite recursion detected in policy".
-- Solusi: pindahkan seluruh cek eligibilitas ke fungsi SECURITY DEFINER
-- (evaluasi sebagai pemilik fungsi → tidak memicu RLS photos berulang).
-- Semantik persis sama dengan desain database.md §4: event aktif, belum
-- expired, dan photo_limit terhormat (NULL = unlimited / Pro).

create or replace function public.can_guest_upload(p_event_id uuid)
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

-- Fungsi hanya menjawab boolean untuk satu event; dipakai evaluator policy
-- (anon) dan bisa dipakai API route sebagai pre-check murah.
revoke execute on function public.can_guest_upload(uuid) from public;
grant execute on function public.can_guest_upload(uuid) to anon, authenticated, service_role;

drop policy if exists p_guest_insert on public.photos;
create policy p_guest_insert on public.photos for insert to anon
  with check (public.can_guest_upload(event_id));

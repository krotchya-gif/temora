-- 0007_rls — database.md §4 (+ whatsapp_logs, patch audit 2026-08-26)
-- Guard pertama; API route adalah guard kedua (defense in depth).
-- Service role bypass RLS — hanya di server/API routes, never client.

alter table public.vendors enable row level security;
alter table public.events  enable row level security;
alter table public.tables  enable row level security;
alter table public.photos  enable row level security;
alter table public.subscriptions enable row level security;
alter table public.whatsapp_logs enable row level security;

-- Vendor kelola dirinya
create policy v_self on public.vendors for all
  using (auth.uid() = id);

-- Vendor kelola event miliknya
create policy e_owner on public.events for all
  using (auth.uid() = vendor_id);

-- TAMU (anon): hanya baca event AKTIF via anon key (untuk halaman photobooth)
create policy e_public_read on public.events for select to anon
  using (is_active = true and (expires_at is null or expires_at > now()));

-- Tamu baca daftar meja event aktif & belum expired
create policy t_public_read on public.tables for select to anon
  using (exists (
    select 1 from public.events e
    where e.id = event_id and e.is_active
      and (e.expires_at is null or e.expires_at > now())
  ));

-- Tamu UPLOAD foto: guard cadangan (jalur utama = API service role).
-- Anti-pattern dilarang keras: FOR SELECT USING (true) pada photos.
create policy p_guest_insert on public.photos for insert to anon
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and e.is_active
        and (e.expires_at is null or e.expires_at > now())
        and (
          e.photo_limit is null
          or (select count(*) from public.photos p
              where p.event_id = e.id and p.deleted_at is null) < e.photo_limit
        )
    )
  );

-- TAMU TIDAK BISA baca foto (privasi by design).
-- Vendor baca/kelola foto event miliknya:
create policy p_owner_all on public.photos for all
  using (exists (
    select 1 from public.events e
    where e.id = event_id and e.vendor_id = auth.uid()
  ));

-- Subscription hanya milik vendor
create policy s_owner on public.subscriptions for all
  using (auth.uid() = vendor_id);

-- Log WhatsApp hanya milik vendor (ditulis service role; tanpa akses anon)
create policy w_owner on public.whatsapp_logs for all
  using (auth.uid() = vendor_id);

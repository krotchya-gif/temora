-- 0010_tables_owner_rls — temuan task 005: owner vendor belum bisa
-- membuat/menghapus meja (policy lama hanya t_public_read utk anon SELECT),
-- sehingga API generate tabel gagal diam-diam di bawah RLS.

drop policy if exists "t_owner_all" on public.tables;
create policy "t_owner_all" on public.tables
  for all
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.vendor_id = auth.uid()
    )
  );

-- Seed dev (task 002): 1 vendor test + 1 event + 2 meja.
-- Hanya untuk lingkungan development (supabase db reset).

insert into public.vendors (id, email, name, subscription_tier)
values (
  '00000000-0000-4000-8000-000000000001',
  'dev@temora.test',
  'Vendor Dev',
  'free'
) on conflict (id) do nothing;

insert into public.events (id, vendor_id, name, slug, theme, location, is_active, photo_limit)
values (
  '00000000-0000-4000-8000-0000000000e1',
  '00000000-0000-4000-8000-000000000001',
  'Pernikahan Dev',
  'pernikahan-dev',
  'wedding',
  'Yogyakarta',
  true,
  100
) on conflict (id) do nothing;

insert into public.tables (id, event_id, label)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-0000000000e1', 'Meja 1'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-0000000000e1', 'Meja 2')
on conflict (event_id, label) do nothing;

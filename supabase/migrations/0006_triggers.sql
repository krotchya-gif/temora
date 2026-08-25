-- 0006_triggers — database.md §3

-- updated_at otomatis
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

create trigger trg_vendors_touch before update on public.vendors
  for each row execute function public.touch_updated_at();

create trigger trg_events_touch before update on public.events
  for each row execute function public.touch_updated_at();

-- Sinkron auth.users -> vendors (SECURITY DEFINER: trigger jalan sebagai pemilik fungsi)
create or replace function public.handle_new_vendor() returns trigger as $$
begin
  insert into public.vendors (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', 'Vendor'));
  return new;
end $$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_vendor();

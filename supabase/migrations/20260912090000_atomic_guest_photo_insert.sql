-- Atomic guest photo insert: serialize quota checks per event.
-- The API uploads media first, then calls this RPC for the authoritative row insert.

create or replace function public.insert_guest_photo_atomic(
  p_event_id uuid,
  p_table_id uuid,
  p_storage_path text,
  p_thumb_path text,
  p_width integer,
  p_height integer,
  p_size_bytes integer,
  p_metadata jsonb
)
returns table(photo_id uuid, capture_token text, duplicate boolean)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_event public.events%rowtype;
  v_existing public.photos%rowtype;
  v_photo_id uuid;
  v_capture_token text;
begin
  select * into v_existing
    from public.photos
   where event_id = p_event_id
     and deleted_at is null
     and metadata->>'client_upload_id' = p_metadata->>'client_upload_id'
   limit 1;

  if found then
    return query select v_existing.id, v_existing.metadata->>'capture_token', true;
    return;
  end if;

  select * into v_event
    from public.events
   where id = p_event_id
   for update;

  if not found or not v_event.is_active
     or (v_event.expires_at is not null and v_event.expires_at <= now()) then
    raise exception 'event_not_available' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.tables
     where id = p_table_id and event_id = p_event_id
  ) then
    raise exception 'table_not_found' using errcode = 'P0001';
  end if;

  if v_event.photo_limit is not null and (
    select count(*) from public.photos
     where event_id = p_event_id and deleted_at is null
  ) >= v_event.photo_limit then
    raise exception 'quota_exceeded' using errcode = 'P0001';
  end if;

  insert into public.photos (
    event_id, table_id, storage_path, thumb_path,
    width, height, size_bytes, metadata
  ) values (
    p_event_id, p_table_id, p_storage_path, p_thumb_path,
    p_width, p_height, p_size_bytes, p_metadata
  )
  returning id, metadata->>'capture_token'
       into v_photo_id, v_capture_token;

  return query select v_photo_id, v_capture_token, false;
exception
  when unique_violation then
    select * into v_existing
      from public.photos
     where event_id = p_event_id
       and deleted_at is null
       and metadata->>'client_upload_id' = p_metadata->>'client_upload_id'
     limit 1;

    if found then
      return query select v_existing.id, v_existing.metadata->>'capture_token', true;
      return;
    end if;
    raise;
end;
$$;

revoke all on function public.insert_guest_photo_atomic(uuid, uuid, text, text, integer, integer, integer, jsonb) from public;
revoke all on function public.insert_guest_photo_atomic(uuid, uuid, text, text, integer, integer, integer, jsonb) from anon;
revoke all on function public.insert_guest_photo_atomic(uuid, uuid, text, text, integer, integer, integer, jsonb) from authenticated;
grant execute on function public.insert_guest_photo_atomic(uuid, uuid, text, text, integer, integer, integer, jsonb) to service_role;

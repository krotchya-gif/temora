-- 0025_event_camera_setup — vendor-controlled guest camera appearance.
alter table public.events
  add column if not exists camera_preset text not null default 'mono-minimal',
  add column if not exists filter_id text,
  add column if not exists filter_strength numeric not null default 0.78;

alter table public.events
  drop constraint if exists events_camera_preset_check;

alter table public.events
  add constraint events_camera_preset_check
  check (camera_preset in ('darkroom', 'rose-gold', 'berry-pop', 'mono-minimal'));

alter table public.events
  drop constraint if exists events_filter_strength_check;

alter table public.events
  add constraint events_filter_strength_check
  check (filter_strength >= 0 and filter_strength <= 1);

comment on column public.events.camera_preset is 'Guest camera appearance selected by the vendor.';
comment on column public.events.filter_id is 'Curated LUT id; null means original color.';
comment on column public.events.filter_strength is 'LUT intensity from 0 to 1.';

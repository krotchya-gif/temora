-- 0024_event_cover — visual cover editor untuk halaman photobooth tamu.
alter table public.events
  add column if not exists cover_template text not null default 'bloom',
  add column if not exists cover_image_url text,
  add column if not exists cover_title text,
  add column if not exists cover_subtitle text,
  add column if not exists cover_button_text text not null default 'Mulai motret';

alter table public.events
  drop constraint if exists events_cover_template_check;

alter table public.events
  add constraint events_cover_template_check
  check (cover_template in ('bloom', 'rose', 'mono', 'night', 'paper'));

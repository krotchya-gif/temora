-- qr_card_setup — vendor-controlled printed QR card copy and visual template.
alter table public.events
  add column if not exists qr_template text not null default 'bloom',
  add column if not exists qr_title text,
  add column if not exists qr_subtitle text,
  add column if not exists qr_tagline text not null default 'Keep the moments close.';

alter table public.events
  drop constraint if exists events_qr_template_check;

alter table public.events
  add constraint events_qr_template_check
  check (qr_template in ('bloom', 'rose', 'mono', 'night', 'paper'));

comment on column public.events.qr_template is 'Visual template for printed table QR cards.';
comment on column public.events.qr_title is 'Optional title printed on table QR cards.';
comment on column public.events.qr_subtitle is 'Optional supporting copy printed on table QR cards.';
comment on column public.events.qr_tagline is 'Tagline printed on table QR cards.';

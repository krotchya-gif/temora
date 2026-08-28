-- 0023_watermark_position — preset posisi watermark hasil foto (task 008, Pro).
-- Keputusan 2026-08-28: teks kustom (watermark_text, sudah ada) + posisi 4 arah
-- dikonfigurasi per event, khusus tier Pro (gate di API, defense in depth).
alter table public.events
  add column watermark_position text not null default 'bottom-right';

alter table public.events
  add constraint watermark_position_format
  check (watermark_position in ('bottom-right', 'bottom-left', 'top-right', 'top-left'));
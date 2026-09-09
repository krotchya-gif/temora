-- Pro may intentionally disable watermark by saving NULL.
ALTER TABLE public.events
  ALTER COLUMN watermark_text DROP DEFAULT;

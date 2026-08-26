-- 0021_seo_admin_ga_keys — key pelengkap tab Analytics (GA4 Data API & GSC).
insert into public.platform_settings (key, value) values
  ('tracking_ga4_property_id', ''),
  ('tracking_gsc_site_url', '')
on conflict (key) do nothing;
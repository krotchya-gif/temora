-- 20260912120000_remove_whatsapp
-- Hapus integrasi notifikasi WhatsApp (keputusan owner 2026-09-12).
-- Aplikasi tidak lagi memakai tabel/kolom ini; aktivasi vendor tetap via
-- deep-link wa.me (NEXT_PUBLIC_WA_ADMIN_NUMBER).
-- Status: file dibuat; apply + verifikasi remote menunggu MCP Supabase.

drop policy if exists w_owner on public.whatsapp_logs;
drop table if exists public.whatsapp_logs;
alter table public.vendors drop column if exists wa_opt_in;

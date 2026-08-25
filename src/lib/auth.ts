// Helper role superadmin (task 018).
// Penanda disimpan di auth.users.app_metadata.role — hanya bisa diubah
// lewat Admin API/SQL (docs/runbook.md §6), tidak mungkin self-assign.

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export const SUPERADMIN_ROLE = "superadmin";

export function isSuperAdmin(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === SUPERADMIN_ROLE;
}

/**
 * Guard untuk RSC/layout: ambil user, lempar ke /dashboard bila bukan
 * superadmin (404-mask via redirect agar keberadaan /admin tak tersingkap).
 */
export async function requireSuperAdminRsc(): Promise<NonNullable<User>> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!isSuperAdmin(user)) redirect("/dashboard");
  return user;
}

/**
 * Guard untuk API route: kembalikan user superadmin atau null.
 * Pemanggil membalas 404 mask (pola repo — jangan bocorkan keberadaan).
 */
export async function getSuperAdminOrNull(): Promise<User | null> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && isSuperAdmin(user) ? user : null;
}

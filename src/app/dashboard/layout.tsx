import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { isSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

async function getSessionInfo(): Promise<{ name: string | null; isAdmin: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Tanpa env (build lokal), shell tetap render dengan nama default.
  if (!url || !anonKey) return { name: null, isAdmin: false };

  // Mulai titik ini route menjadi dinamis (cookies) — tidak boleh di-try/catch.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guard kedua selain middleware (defense in depth).
  if (!user) redirect("/login");

  const { data: vendor } = await supabase
    .from("vendors")
    .select("name")
    .eq("id", user.id)
    .single();

  return { name: vendor?.name ?? null, isAdmin: isSuperAdmin(user) };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { name, isAdmin } = await getSessionInfo();

  return (
    <DashboardShell vendorName={name ?? "Vendor"} isAdmin={isAdmin}>
      {children}
    </DashboardShell>
  );
}

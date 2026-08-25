import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { createClient } from "@/lib/supabase/server";

async function getVendorName(): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Tanpa env (build lokal), shell tetap render dengan nama default.
  if (!url || !anonKey) return null;

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

  return vendor?.name ?? null;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const vendorName = await getVendorName();

  return <DashboardShell vendorName={vendorName ?? "Vendor"}>{children}</DashboardShell>;
}

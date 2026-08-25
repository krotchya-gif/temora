import type { Metadata } from "next";
import { requireSuperAdminRsc } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "TEMORA Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard lapis kedua selain proxy.ts (defense in depth, task 018 §2.3).
  await requireSuperAdminRsc();

  return <AdminShell>{children}</AdminShell>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TierSelect } from "@/components/admin/TierSelect";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Vendors — TEMORA Admin",
};
export const dynamic = "force-dynamic";

type VendorRow = {
  id: string;
  name: string;
  email: string;
  subscription_tier: string;
  created_at: string;
};

const TIER_BADGE: Record<string, string> = {
  free: "bg-bg-warm text-text-secondary",
  basic: "bg-accent/15 text-accent",
  pro: "bg-dusty-blue/15 text-dusty-blue",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const admin = createAdminClient();

  // Skala MVP: hitung event/foto di sisi aplikasi (lihat catatan task 018 §3).
  let request = admin
    .from("vendors")
    .select("id, name, email, subscription_tier, created_at")
    .order("created_at", { ascending: false });
  if (query) {
    request = request.or(`name.ilike.%${query}%,email.ilike.%${query}%`);
  }
  const [{ data: vendors }, { data: events }] = await Promise.all([
    request,
    admin.from("events").select("id, vendor_id, photos(count)"),
  ]);

  type EventRow = {
    id: string;
    vendor_id: string;
    photos: { count: number }[] | null;
  };
  const eventCountByVendor = new Map<string, number>();
  const photoCountByVendor = new Map<string, number>();
  for (const row of (events ?? []) as unknown as EventRow[]) {
    eventCountByVendor.set(
      row.vendor_id,
      (eventCountByVendor.get(row.vendor_id) ?? 0) + 1,
    );
    photoCountByVendor.set(
      row.vendor_id,
      (photoCountByVendor.get(row.vendor_id) ?? 0) + (row.photos?.[0]?.count ?? 0),
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-text-primary">Vendors</h1>
        <p className="text-sm text-text-secondary">
          {(vendors ?? []).length} vendor terdaftar. Ubah paket hanya berlaku
          untuk event baru.
        </p>
      </div>

      <form className="max-w-sm" action="/admin/vendors">
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Cari nama atau email…"
          aria-label="Cari vendor"
        />
      </form>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-secondary">
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Gabung</th>
              <th className="px-4 py-3">Paket</th>
            </tr>
          </thead>
          <tbody>
            {(vendors ?? []).map((vendor: VendorRow) => (
              <tr key={vendor.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-text-primary">{vendor.name}</p>
                  <p className="text-xs text-text-secondary">{vendor.email}</p>
                </td>
                <td className="px-4 py-3 font-mono text-text-primary">
                  {eventCountByVendor.get(vendor.id) ?? 0}
                </td>
                <td className="px-4 py-3 font-mono text-text-primary">
                  {photoCountByVendor.get(vendor.id) ?? 0}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {formatDate(vendor.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        TIER_BADGE[vendor.subscription_tier] ?? TIER_BADGE.free
                      }`}
                    >
                      {vendor.subscription_tier}
                    </span>
                    <TierSelect
                      vendorId={vendor.id}
                      vendorName={vendor.name}
                      currentTier={vendor.subscription_tier}
                    />
                  </div>
                  <Link
                    href={`/admin/events?vendor=${vendor.id}`}
                    className="mt-1 inline-block text-xs text-dusty-blue hover:underline"
                  >
                    Lihat event
                  </Link>
                </td>
              </tr>
            ))}
            {(vendors ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-secondary">
                  Tidak ada vendor yang cocok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

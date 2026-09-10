import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TierSelect } from "@/components/admin/TierSelect";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeSearchQuery } from "@/lib/security";

export const metadata: Metadata = {
  title: "Vendors — TEMORA Admin",
};
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

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
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = sanitizeSearchQuery(params.q);
  const page = Math.max(1, Number(params.page) || 1);
  const admin = createAdminClient();

  // Skala MVP: agregat event/foto dihitung sisi aplikasi (lihat task 019).
  let request = admin
    .from("vendors")
    .select("id, name, email, subscription_tier, banned_at, created_at")
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (query) {
    request = request.or(`name.ilike.%${query}%,email.ilike.%${query}%`);
  }

  let countRequest = admin
    .from("vendors")
    .select("id", { count: "exact", head: true });
  if (query) {
    countRequest = countRequest.or(`name.ilike.%${query}%,email.ilike.%${query}%`);
  }

  const [{ data: vendorData }, { count }] = await Promise.all([request, countRequest]);
  const vendors = (vendorData ?? []) as Array<{
    id: string;
    name: string;
    email: string;
    subscription_tier: string;
    banned_at: string | null;
    created_at: string;
  }>;
  const vendorIds = vendors.map((vendor) => vendor.id);
  const { data: events } = vendorIds.length
    ? await admin
        .from("events")
        .select("id, vendor_id, is_active, photos(count)")
        .in("vendor_id", vendorIds)
    : { data: [] };

  type EventRow = {
    id: string;
    vendor_id: string;
    is_active: boolean;
    photos: { count: number }[] | null;
  };
  const eventCount = new Map<string, number>();
  const activeCount = new Map<string, number>();
  const photoCount = new Map<string, number>();
  for (const row of (events ?? []) as unknown as EventRow[]) {
    eventCount.set(row.vendor_id, (eventCount.get(row.vendor_id) ?? 0) + 1);
    if (row.is_active) {
      activeCount.set(row.vendor_id, (activeCount.get(row.vendor_id) ?? 0) + 1);
    }
    photoCount.set(
      row.vendor_id,
      (photoCount.get(row.vendor_id) ?? 0) + (row.photos?.[0]?.count ?? 0),
    );
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-text-primary">Vendors</h1>
        <p className="text-sm text-text-secondary">
          {total} vendor terdaftar. Klik nama untuk detail & manajemen.
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

      <div className="space-y-3 lg:hidden">
        {vendors.map((vendor) => (
          <Card key={vendor.id} className="space-y-4 p-4">
            <div>
              <Link href={`/admin/vendors/${vendor.id}`} className="font-medium text-text-primary hover:text-accent hover:underline">
                {vendor.name}
              </Link>
              <p className="break-all text-xs text-text-secondary">{vendor.email}</p>
              {vendor.banned_at ? <span className="mt-2 inline-block rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-medium text-danger">Banned</span> : null}
            </div>
            <dl className="grid grid-cols-3 gap-3 text-xs text-text-secondary">
              <div><dt>Event aktif</dt><dd className="mt-1 font-mono text-sm text-text-primary">{activeCount.get(vendor.id) ?? 0} / {eventCount.get(vendor.id) ?? 0}</dd></div>
              <div><dt>Foto</dt><dd className="mt-1 font-mono text-sm text-text-primary">{photoCount.get(vendor.id) ?? 0}</dd></div>
              <div><dt>Gabung</dt><dd className="mt-1 text-text-primary">{formatDate(vendor.created_at)}</dd></div>
            </dl>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-medium ${TIER_BADGE[vendor.subscription_tier] ?? TIER_BADGE.free}`}>{vendor.subscription_tier}</span>
              <TierSelect vendorId={vendor.id} vendorName={vendor.name} currentTier={vendor.subscription_tier} />
            </div>
          </Card>
        ))}
        {vendors.length === 0 ? <Card className="p-8 text-center text-sm text-text-secondary">Tidak ada vendor yang cocok.</Card> : null}
      </div>

      <Card className="hidden overflow-x-auto p-0 lg:block">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-secondary">
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Event aktif</th>
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Gabung</th>
              <th className="px-4 py-3">Paket</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor) => (
                <tr
                  key={vendor.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/vendors/${vendor.id}`}
                      className="font-medium text-text-primary hover:text-accent hover:underline"
                    >
                      {vendor.name}
                    </Link>
                    <p className="text-xs text-text-secondary">{vendor.email}</p>
                    {vendor.banned_at && (
                      <p className="mt-0.5 inline-block rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-medium text-danger">
                        Banned
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-text-primary">
                    {(activeCount.get(vendor.id) ?? 0)} /{" "}
                    {eventCount.get(vendor.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 font-mono text-text-primary">
                    {photoCount.get(vendor.id) ?? 0}
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
                  </td>
                </tr>
              ))}
            {vendors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-secondary">
                  Tidak ada vendor yang cocok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <nav aria-label="Navigasi halaman" className="flex items-center justify-between gap-2">
          {page > 1 ? (
            <Link
              href={`/admin/vendors?q=${encodeURIComponent(query)}&page=${page - 1}`}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-dusty-blue hover:bg-bg-warm"
            >
              ← Sebelumnya
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-text-secondary">
            Halaman {page} dari {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/vendors?q=${encodeURIComponent(query)}&page=${page + 1}`}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-dusty-blue hover:bg-bg-warm"
            >
              Berikutnya →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

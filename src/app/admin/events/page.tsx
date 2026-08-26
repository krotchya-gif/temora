import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EventStatusButton } from "@/components/admin/EventStatusButton";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeSearchQuery } from "@/lib/security";
import { isUuid } from "@/lib/events";

export const metadata: Metadata = {
  title: "Events — TEMORA Admin",
};
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const STATUS_FILTERS = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
] as const;

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function buildQuery(overrides: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(overrides)) {
    if (value) params.set(key, value);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; vendor?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = sanitizeSearchQuery(params.q);
  const status = ["all", "active", "inactive"].includes(params.status ?? "")
    ? (params.status ?? "all")
    : "all";
  // Param vendor divalidasi — nilai acak jangan sampai dikirim ke PostgREST.
  const vendorFilter =
    params.vendor && isUuid(params.vendor) ? params.vendor : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const admin = createAdminClient();

  let request = admin
    .from("events")
    .select(
      "id, name, slug, is_active, expires_at, vendor:vendors(id, name), photos(count)",
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  let countRequest = admin
    .from("events")
    .select("id", { count: "exact", head: true });

  if (status === "active") request = request.eq("is_active", true);
  if (status === "inactive") request = request.eq("is_active", false);
  if (status === "active") countRequest = countRequest.eq("is_active", true);
  if (status === "inactive") countRequest = countRequest.eq("is_active", false);
  if (vendorFilter) {
    request = request.eq("vendor_id", vendorFilter);
    countRequest = countRequest.eq("vendor_id", vendorFilter);
  }
  if (query) {
    request = request.or(`name.ilike.%${query}%,slug.ilike.%${query}%`);
    countRequest = countRequest.or(`name.ilike.%${query}%,slug.ilike.%${query}%`);
  }

  const [{ data, count }] = await Promise.all([request, countRequest]);
  const events = (data ?? []) as unknown as Array<{
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    expires_at: string | null;
    vendor: { id: string; name: string } | null;
    photos: { count: number }[] | null;
  }>;

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (nextPage: number) =>
    `/admin/events${buildQuery({
      status: status !== "all" ? status : undefined,
      vendor: vendorFilter,
      q: query || undefined,
      page: nextPage > 1 ? String(nextPage) : undefined,
    })}`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-text-primary">Events</h1>
        <p className="text-sm text-text-secondary">
          {total} event. Menonaktifkan event langsung memutus akses tamu.
        </p>
      </div>

      <form action="/admin/events" className="flex max-w-md items-center gap-2">
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        {vendorFilter && <input type="hidden" name="vendor" value={vendorFilter} />}
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Cari nama atau slug event…"
          aria-label="Cari event"
        />
      </form>

      <nav aria-label="Filter status" className="flex items-center gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = status === filter.value;
          return (
            <Link
              key={filter.value}
              href={`/admin/events${buildQuery({
                status: filter.value !== "all" ? filter.value : undefined,
                vendor: vendorFilter,
                q: query || undefined,
              })}`}
              aria-current={active ? "true" : undefined}
              className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-bg-warm font-medium text-accent"
                  : "text-text-secondary hover:bg-bg-warm"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-secondary">
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Expired</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="font-medium text-text-primary hover:text-accent hover:underline"
                  >
                    {event.name}
                  </Link>
                  <p className="text-xs text-text-secondary">/{event.slug}</p>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {event.vendor?.id ? (
                    <Link
                      href={`/admin/vendors/${event.vendor.id}`}
                      className="hover:text-accent hover:underline"
                    >
                      {event.vendor?.name ?? "—"}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-text-primary">
                  {event.photos?.[0]?.count ?? 0}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {formatDate(event.expires_at) ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <EventStatusButton
                    eventId={event.id}
                    eventName={event.name}
                    isActive={event.is_active}
                  />
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-secondary">
                  Tidak ada event pada filter ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <nav aria-label="Navigasi halaman" className="flex items-center justify-between">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="min-h-9 rounded-lg px-3 py-1.5 text-sm text-dusty-blue hover:bg-bg-warm"
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
              href={pageHref(page + 1)}
              className="min-h-9 rounded-lg px-3 py-1.5 text-sm text-dusty-blue hover:bg-bg-warm"
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

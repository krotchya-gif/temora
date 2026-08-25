import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EventStatusButton } from "@/components/admin/EventStatusButton";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Events — TEMORA Admin",
};
export const dynamic = "force-dynamic";

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

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; vendor?: string }>;
}) {
  const { status, vendor } = await searchParams;
  const admin = createAdminClient();

  let request = admin
    .from("events")
    .select("id, name, slug, is_active, expires_at, vendor:vendors(id, name), photos(count)")
    .order("created_at", { ascending: false });
  if (status === "active") request = request.eq("is_active", true);
  if (status === "inactive") request = request.eq("is_active", false);
  if (vendor) request = request.eq("vendor_id", vendor);

  type EventRow = {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    expires_at: string | null;
    vendor: { name: string } | null;
    photos: { count: number }[] | null;
  };
  const { data } = await request;
  const events = (data ?? []) as unknown as EventRow[];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-text-primary">Events</h1>
        <p className="text-sm text-text-secondary">
          {events.length} event. Menonaktifkan event langsung memutus akses tamu.
        </p>
      </div>

      <nav aria-label="Filter status" className="flex items-center gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = (status ?? "all") === filter.value;
          const params = new URLSearchParams();
          if (filter.value !== "all") params.set("status", filter.value);
          if (vendor) params.set("vendor", vendor);
          const href = `/admin/events${params.size > 0 ? `?${params}` : ""}`;
          return (
            <Link
              key={filter.value}
              href={href}
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
                  {event.vendor?.name ?? "—"}
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
    </div>
  );
}

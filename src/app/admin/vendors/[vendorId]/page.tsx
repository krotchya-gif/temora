import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { TierSelect } from "@/components/admin/TierSelect";
import { EditVendorForm } from "@/components/admin/EditVendorForm";
import { BanVendorButton } from "@/components/admin/BanVendorButton";
import { DeleteVendorZone } from "@/components/admin/DeleteVendorZone";
import { EventStatusButton } from "@/components/admin/EventStatusButton";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Detail Vendor — TEMORA Admin",
};
export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

// Dipisah agar lolos aturan purity react-hooks.
function weekAgoIso(): string {
  return new Date(Date.now() - 7 * 86_400_000).toISOString();
}

const SUB_BADGE: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  paid: "bg-success/15 text-success",
  expired: "bg-bg-warm text-text-secondary",
  failed: "bg-danger/15 text-danger",
};

export default async function AdminVendorDetailPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = await params;
  const admin = createAdminClient();

  const { data: vendor } = await admin
    .from("vendors")
    .select(
      "id, name, email, company_name, phone, subscription_tier, wa_opt_in, banned_at, created_at",
    )
    .eq("id", vendorId)
    .maybeSingle();
  if (!vendor) notFound();

  const { data: events } = await admin
    .from("events")
    .select("id, name, slug, is_active, expires_at, photos(count)")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  const eventIds = (events ?? []).map((e) => e.id);
  const fallbackIds = ["00000000-0000-0000-0000-000000000000"];

  const [
    { data: subscriptions },
    { data: waFailed },
    { data: auditRows },
    { count: totalPhotos },
    { count: savedPhotos },
  ] = await Promise.all([
    admin
      .from("subscriptions")
      .select("id, tier, amount_idr, status, period_start, period_end, created_at")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("whatsapp_logs")
      .select("kind, error, created_at")
      .eq("vendor_id", vendorId)
      .eq("status", "failed")
      .gte("created_at", weekAgoIso())
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("admin_audit_logs")
      .select("actor_email, action, target_type, target_id, created_at")
      .or(`target_id.eq.${vendorId},actor_id.eq.${vendorId}`)
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("photos")
      .select("id", { count: "exact", head: true })
      .in("event_id", eventIds.length > 0 ? eventIds : fallbackIds)
      .is("deleted_at", null),
    admin
      .from("photos")
      .select("id", { count: "exact", head: true })
      .in("event_id", eventIds.length > 0 ? eventIds : fallbackIds)
      .not("guest_saved_at", "is", null)
      .is("deleted_at", null),
  ]);

  const eventList = (events ?? []) as Array<{
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    expires_at: string | null;
    photos: { count: number }[] | null;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link href="/admin/vendors" className="text-xs text-dusty-blue hover:underline">
            ← Semua vendor
          </Link>
          <h1 className="font-display text-3xl text-text-primary">
            {vendor.name}
          </h1>
          <p className="text-sm text-text-secondary">
            {vendor.email} · gabung {formatDate(vendor.created_at)}
            {vendor.banned_at && (
              <span className="ml-2 rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-medium text-danger">
                Banned sejak {formatDate(vendor.banned_at)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TierSelect
            vendorId={vendor.id}
            vendorName={vendor.name}
            currentTier={vendor.subscription_tier}
          />
          <BanVendorButton
            vendorId={vendor.id}
            vendorName={vendor.name}
            banned={Boolean(vendor.banned_at)}
          />
        </div>
      </div>

      <Card className="space-y-4 p-5">
        <h2 className="font-display text-xl text-text-primary">Profil</h2>
        <EditVendorForm
          vendorId={vendor.id}
          initial={{
            name: vendor.name,
            companyName: vendor.company_name ?? "",
            phone: vendor.phone ?? "",
            waOptIn: vendor.wa_opt_in,
          }}
        />
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-xl text-text-primary">Ringkasan</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-secondary">Event</p>
            <p className="font-mono text-2xl text-text-primary">{eventList.length}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-secondary">Aktif</p>
            <p className="font-mono text-2xl text-text-primary">
              {eventList.filter((e) => e.is_active).length}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-secondary">Foto</p>
            <p className="font-mono text-2xl text-text-primary">{totalPhotos ?? 0}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-secondary">Disimpan tamu</p>
            <p className="font-mono text-2xl text-text-primary">{savedPhotos ?? 0}</p>
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <h2 className="border-b border-border px-4 py-3 font-display text-xl text-text-primary">
          Events
        </h2>
        <table className="w-full min-w-[600px] text-left text-sm">
          <tbody>
            {eventList.map((event) => (
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
                <td className="px-4 py-3 font-mono text-text-primary">
                  {event.photos?.[0]?.count ?? 0} foto
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  expired {formatDate(event.expires_at) ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <EventStatusButton
                    eventId={event.id}
                    eventName={event.name}
                    isActive={event.is_active}
                  />
                </td>
              </tr>
            ))}
            {eventList.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-text-secondary">
                  Belum ada event.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto p-0">
        <h2 className="border-b border-border px-4 py-3 font-display text-xl text-text-primary">
          Subscription
        </h2>
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-secondary">
              <th className="px-4 py-3">Paket</th>
              <th className="px-4 py-3">Nominal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Periode</th>
            </tr>
          </thead>
          <tbody>
            {(subscriptions ?? []).map((sub) => (
              <tr key={sub.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3 capitalize text-text-primary">{sub.tier}</td>
                <td className="px-4 py-3 font-mono text-text-primary">
                  Rp {sub.amount_idr.toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      SUB_BADGE[sub.status] ?? SUB_BADGE.pending
                    }`}
                  >
                    {sub.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  {formatDate(sub.period_start) ?? "—"} →{" "}
                  {formatDate(sub.period_end) ?? "—"}
                </td>
              </tr>
            ))}
            {(subscriptions ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                  Belum pernah berlangganan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-xl text-text-primary">WhatsApp (7 hari)</h2>
          {(waFailed ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-text-secondary">
              Tidak ada pengiriman gagal. ✓
            </p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {(waFailed ?? []).map((log, i) => (
                <li key={i} className="rounded-lg bg-bg-warm px-3 py-2">
                  <span className="capitalize text-text-primary">{log.kind}</span>{" "}
                  — <span className="text-danger">{log.error ?? "gagal"}</span>
                  <span className="block text-xs text-text-secondary">
                    {formatDate(log.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-xl text-text-primary">Audit terkait</h2>
          {(auditRows ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-text-secondary">Belum ada aksi.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {(auditRows ?? []).map((row) => (
                <li key={`${row.created_at}-${row.action}`} className="rounded-lg bg-bg-warm px-3 py-2">
                  <span className="font-mono text-xs text-accent">{row.action}</span>{" "}
                  oleh {row.actor_email}
                  <span className="block text-xs text-text-secondary">
                    {formatDate(row.created_at)} · {row.target_type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="border-danger/30 p-5">
        <h2 className="font-display text-xl text-danger">Danger Zone</h2>
        <p className="mb-3 mt-1 text-sm text-text-secondary">
          Penghapusan permanen menghapus seluruh data & objek storage vendor.
        </p>
        <DeleteVendorZone vendorId={vendor.id} vendorEmail={vendor.email} />
      </Card>
    </div>
  );
}

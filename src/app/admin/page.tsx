import Link from "next/link";
import { Camera, Images, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// Overview superadmin (task 019): statistik inti + kesehatan operasional.
export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const [
    { count: totalVendors },
    { count: totalEvents },
    { count: activeEvents },
    { count: totalPhotos },
    { data: tiers },
    { data: subs },
    { data: auditRows },
    { data: sizes },
  ] = await Promise.all([
    admin.from("vendors").select("id", { count: "exact", head: true }),
    admin.from("events").select("id", { count: "exact", head: true }),
    admin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    admin
      .from("photos")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    admin.from("vendors").select("subscription_tier, banned_at"),
    admin.from("subscriptions").select("status"),
    admin
      .from("admin_audit_logs")
      .select("actor_email, action, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    // Estimasi storage: sampel hingga 2000 baris terbaru (cukup utk skala MVP).
    admin.from("photos").select("size_bytes").is("deleted_at", null).limit(2000),
  ]);

  const tierCount = { free: 0, basic: 0, pro: 0 };
  const bannedCount = (tiers ?? []).filter((t) => t.banned_at).length;
  for (const row of tiers ?? []) {
    if (row.subscription_tier in tierCount) {
      tierCount[row.subscription_tier as keyof typeof tierCount] += 1;
    }
  }

  const subCount = { pending: 0, paid: 0, expired: 0, failed: 0 };
  for (const row of subs ?? []) {
    if (row.status in subCount) {
      subCount[row.status as keyof typeof subCount] += 1;
    }
  }

  const sampledBytes = (sizes ?? []).reduce((sum, r) => sum + (r.size_bytes ?? 0), 0);
  const storageMb = sampledBytes / (1024 * 1024);
  const storageLabel =
    storageMb >= 1024
      ? `${(storageMb / 1024).toFixed(1)} GB`
      : `${storageMb.toFixed(1)} MB`;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-text-primary">Overview</h1>
        <p className="text-sm text-text-secondary">
          Pantauan platform TEMORA lintas-vendor.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">Vendor</p>
            <Users className="h-4 w-4 text-dusty-blue" aria-hidden />
          </div>
          <p className="font-mono text-2xl tracking-tight text-text-primary">
            {totalVendors ?? 0}
          </p>
          <p className="text-xs text-text-secondary">
            F {tierCount.free} · B {tierCount.basic} · P {tierCount.pro} · banned{" "}
            {bannedCount}
          </p>
        </Card>

        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">Event aktif / total</p>
            <Link href="/admin/events" aria-label="Lihat events">
              <Camera className="h-4 w-4 text-dusty-blue" />
            </Link>
          </div>
          <p className="font-mono text-2xl tracking-tight text-text-primary">
            {activeEvents ?? 0} / {totalEvents ?? 0}
          </p>
        </Card>

        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">Foto tersimpan</p>
            <Images className="h-4 w-4 text-dusty-blue" aria-hidden />
          </div>
          <p className="font-mono text-2xl tracking-tight text-text-primary">
            {totalPhotos ?? 0}
          </p>
          <p className="text-xs text-text-secondary">
            ±{storageLabel} (sampel)
          </p>
        </Card>

        <Card className="space-y-2">
          <p className="text-sm text-text-secondary">Operasional</p>
          <p className="font-mono text-lg tracking-tight text-text-primary">
            Subs paid {subCount.paid} / pending {subCount.pending}
          </p>
          <p className="text-xs text-text-secondary">
            expired {subCount.expired}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-text-primary">Aksi terakhir</h2>
          <Link href="/admin/audit" className="text-sm text-dusty-blue hover:underline">
            Lihat semua →
          </Link>
        </div>
        {(auditRows ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">Belum ada aksi admin.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {(auditRows ?? []).map((row) => (
              <li
                key={`${row.created_at}-${row.action}`}
                className="flex items-center justify-between rounded-lg bg-bg-warm px-3 py-2"
              >
                <span>
                  <span className="font-mono text-xs text-accent">{row.action}</span>{" "}
                  oleh {row.actor_email}
                </span>
                <span className="text-xs text-text-secondary">
                  {formatDate(row.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

import { CalendarDays, Camera, Images, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Overview superadmin (task 018) — statistik lintas-vendor via service role.
export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const [
    { count: totalVendors },
    { count: totalEvents },
    { count: activeEvents },
    { count: totalPhotos },
    { data: tiers },
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
    admin.from("vendors").select("subscription_tier"),
  ]);

  const tierCount = { free: 0, basic: 0, pro: 0 };
  for (const row of tiers ?? []) {
    if (row.subscription_tier in tierCount) {
      tierCount[row.subscription_tier as keyof typeof tierCount] += 1;
    }
  }

  const stats = [
    { label: "Vendor", value: totalVendors ?? 0, icon: Users },
    {
      label: "Event aktif / total",
      value: `${activeEvents ?? 0} / ${totalEvents ?? 0}`,
      icon: CalendarDays,
    },
    { label: "Foto tersimpan", value: totalPhotos ?? 0, icon: Camera },
    {
      label: "Distribusi tier",
      value: `F ${tierCount.free} · B ${tierCount.basic} · P ${tierCount.pro}`,
      icon: Images,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-text-primary">Overview</h1>
        <p className="text-sm text-text-secondary">
          Pantauan platform TEMORA lintas-vendor.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">{stat.label}</p>
                <Icon className="h-4 w-4 text-dusty-blue" aria-hidden />
              </div>
              <p className="font-mono text-2xl tracking-tight text-text-primary">
                {stat.value}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { CalendarDays, Camera, Images } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Layout dashboard sudah mem-guard sesi; ini pengaman tambahan.
  if (!user) return null;

  const { data: eventIds } = await supabase
    .from("events")
    .select("id")
    .eq("vendor_id", user.id);
  const ownedIds = eventIds?.map((e) => e.id) ?? [];

  const countPhotos = async (savedOnly: boolean) => {
    if (ownedIds.length === 0) return 0;
    let query = supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .in("event_id", ownedIds)
      .is("deleted_at", null);
    if (savedOnly) query = query.not("guest_saved_at", "is", null);
    const { count } = await query;
    return count ?? 0;
  };

  const [{ count: activeEvents }, totalPhotos, savedMoments] = await Promise.all([
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", user.id)
      .eq("is_active", true),
    countPhotos(false),
    countPhotos(true),
  ]);

  const hasEvents = ownedIds.length > 0;

  const stats = [
    { label: "Event aktif", value: activeEvents ?? 0, icon: CalendarDays },
    { label: "Total foto", value: totalPhotos ?? 0, icon: Camera },
    { label: "Momen disimpan tamu", value: savedMoments ?? 0, icon: Images },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-text-primary">Overview</h1>
        <p className="text-sm text-text-secondary">
          Ringkasan event dan momen yang terkumpul.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">{stat.label}</p>
                <Icon className="h-4 w-4 text-dusty-blue" aria-hidden />
              </div>
              <p className="font-mono text-3xl tracking-tight text-text-primary">
                {stat.value}
              </p>
            </Card>
          );
        })}
      </div>

      {!hasEvents && (
        <Card className="px-6 py-12 text-center sm:px-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-warm">
            <Camera className="h-5 w-5 text-accent" aria-hidden />
          </div>
          <h2 className="mt-5 font-display text-2xl text-text-primary">
            Belum ada event. Buat event pertamamu.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
            Upload frame, generate QR meja, lalu bagikan ke tamu. Semuanya bisa
            disiapkan dalam hitungan menit.
          </p>
          <Button href="/dashboard/events/new" className="mt-6">
            Buat Event Pertama
          </Button>
        </Card>
      )}
    </div>
  );
}

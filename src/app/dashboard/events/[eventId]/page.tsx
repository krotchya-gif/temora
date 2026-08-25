import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Images, QrCode } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EventStatusControls } from "@/components/dashboard/EventStatusControls";
import { EventSubNav } from "@/components/dashboard/EventSubNav";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Detail Event",
};

type EventDetailProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventDetailPage({ params }: EventDetailProps) {
  const { eventId } = await params;

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, slug, theme, starts_at, ends_at, location, is_active, photo_limit",
    )
    .eq("id", eventId)
    .maybeSingle();

  // RLS: event milik vendor lain tidak terlihat.
  if (!event) notFound();

  // Statistik ringkas: jumlah foto, jumlah meja, total scan.
  const [{ count: photoCount }, { data: tablesAgg }] = await Promise.all([
    supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .is("deleted_at", null),
    supabase
      .from("tables")
      .select("scan_count")
      .eq("event_id", eventId),
  ]);
  const tableCount = tablesAgg?.length ?? 0;
  const scanTotal = (tablesAgg ?? []).reduce((sum, t) => sum + t.scan_count, 0);

  const dateLabel = event.starts_at
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(event.starts_at))
    : null;

  const stats = [
    {
      label: "Momen terkumpul",
      value: (photoCount ?? 0).toLocaleString("id-ID"),
      icon: Images,
    },
    { label: "Meja", value: String(tableCount), icon: QrCode },
    { label: "Scan QR", value: scanTotal.toLocaleString("id-ID"), icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/events"
        className="inline-flex text-sm text-text-secondary transition-colors hover:text-accent"
      >
        ← Semua event
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl leading-tight text-text-primary">
              {event.name}
            </h1>
            <span
              className={
                event.is_active
                  ? "rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success"
                  : "rounded-full bg-bg-warm px-2.5 py-1 text-xs font-medium text-text-secondary"
              }
            >
              {event.is_active ? "Aktif" : "Nonaktif"}
            </span>
          </div>
          <p className="text-sm text-text-secondary">
            {[
              dateLabel,
              event.location,
              `Kuota ${event.photo_limit === null ? "unlimited" : `${event.photo_limit} foto`}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="font-mono text-xs text-text-secondary">/p/{event.slug}</p>
        </div>

        <EventStatusControls eventId={eventId} isActive={event.is_active} />
      </div>

      <EventSubNav eventId={eventId} />

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

      <Card className="flex flex-col items-start justify-between gap-3 bg-bg-warm px-5 py-4 sm:flex-row sm:items-center">
        <p className="text-sm text-text-secondary">
          Lihat semua foto tamu di galeri event ini.
        </p>
        <Link
          href={`/dashboard/events/${eventId}/gallery`}
          className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
        >
          Buka Galeri
        </Link>
      </Card>

      <Card className="flex flex-col items-start justify-between gap-3 bg-bg-warm px-5 py-4 sm:flex-row sm:items-center">
        <p className="text-sm text-text-secondary">
          Ubah nama, tema, jadwal, atau frame event ini.
        </p>
        <Link
          href={`/dashboard/events/${eventId}/edit`}
          className="inline-flex min-h-11 items-center rounded-lg border border-accent/30 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
        >
          Edit Event
        </Link>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Camera, Images, Palette, QrCode } from "lucide-react";
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

      <section className="space-y-4" aria-labelledby="event-setup-heading">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-accent uppercase">Setup event</p>
          <h2 id="event-setup-heading" className="mt-1 font-display text-2xl text-text-primary">
            Sekarang bikin tampilannya terasa kamu
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">
            Detail event sudah tersimpan. Lanjutkan dengan mengatur apa yang akan
            dilihat tamu saat mereka scan QR dan mulai mengambil foto.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href={`/dashboard/events/${eventId}/cover`} className="group rounded-xl border border-border bg-bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted-mauve/15 text-muted-mauve"><Palette className="h-4 w-4" aria-hidden /></span>
            <p className="mt-4 text-sm font-medium text-text-primary">Edit cover</p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">Template, foto, judul, subjudul, dan tombol.</p>
            <span className="mt-3 inline-block text-xs font-medium text-accent group-hover:underline">Edit cover →</span>
          </Link>
          <Link href={`/dashboard/events/${eventId}/qr`} className="group rounded-xl border border-border bg-bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-secondary/15 text-accent"><QrCode className="h-4 w-4" aria-hidden /></span>
            <p className="mt-4 text-sm font-medium text-text-primary">Kartu QR</p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">Buat meja dan siapkan kartu untuk dicetak.</p>
            <span className="mt-3 inline-block text-xs font-medium text-accent group-hover:underline">Kelola QR →</span>
          </Link>
          <Link href={`/dashboard/events/${eventId}/gallery`} className="group rounded-xl border border-border bg-bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-dusty-blue/15 text-dusty-blue"><Camera className="h-4 w-4" aria-hidden /></span>
            <p className="mt-4 text-sm font-medium text-text-primary">Hasil foto</p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">Lihat momen yang sudah dikumpulkan tamu.</p>
            <span className="mt-3 inline-block text-xs font-medium text-accent group-hover:underline">Buka galeri →</span>
          </Link>
        </div>
      </section>

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

    </div>
  );
}

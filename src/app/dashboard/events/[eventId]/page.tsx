import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Images, QrCode } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EventSubNav } from "@/components/dashboard/EventSubNav";
import { demoEvent, DEMO_EVENT_ID } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Detail Event",
};

type EventDetailProps = {
  params: Promise<{ eventId: string }>;
};

const stats = [
  { label: "Momen terkumpul", value: demoEvent.photoCount.toLocaleString("id-ID"), icon: Images },
  { label: "Meja", value: String(demoEvent.tableCount), icon: QrCode },
  { label: "Scan QR", value: String(demoEvent.scanCount), icon: CalendarDays },
];

export default async function EventDetailPage({ params }: EventDetailProps) {
  const { eventId } = await params;
  const isDemo = eventId === DEMO_EVENT_ID;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/events"
        className="inline-flex text-sm text-text-secondary transition-colors hover:text-accent"
      >
        ← Semua event
      </Link>

      {!isDemo ? (
        <>
          <div className="space-y-1.5">
            <h1 className="font-display text-3xl leading-tight text-text-primary">
              Detail event
            </h1>
            <p className="text-sm text-text-secondary">
              Data event milikmu akan tampil di sini setelah koneksi database
              siap.
            </p>
          </div>
          <EventSubNav eventId={eventId} />
          <Card className="px-6 py-12 text-center">
            <p className="font-display text-xl text-text-primary">
              Menunggu integrasi database
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
              Ingin melihat bentuk halamannya? Buka contoh dengan data demo.
            </p>
            <Button
              href={`/dashboard/events/${DEMO_EVENT_ID}`}
              variant="secondary"
              className="mt-6"
            >
              Lihat Contoh
            </Button>
          </Card>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl leading-tight text-text-primary">
                  {demoEvent.name}
                </h1>
                <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  Aktif
                </span>
              </div>
              <p className="text-sm text-text-secondary">
                {demoEvent.theme} · {demoEvent.dateLabel} · {demoEvent.location}
              </p>
            </div>
            <Button variant="secondary" size="sm" disabled>
              Nonaktifkan
            </Button>
          </div>

          <p className="text-xs text-text-secondary">
            Aksi aktif/nonaktif berfungsi setelah koneksi database siap.
          </p>

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

          <Card className="flex items-center justify-between gap-4 bg-bg-warm px-5 py-4">
            <p className="text-sm text-text-secondary">
              Lihat semua foto tamu di galeri event ini.
            </p>
            <Button href={`/dashboard/events/${eventId}/gallery`} size="sm">
              Buka Galeri
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}

export function generateStaticParams() {
  return [{ eventId: DEMO_EVENT_ID }];
}

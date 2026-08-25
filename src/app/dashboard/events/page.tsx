import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEMO_EVENT_ID } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Events",
};

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-text-primary">Events</h1>
          <p className="text-sm text-text-secondary">Kelola semua acara kamu.</p>
        </div>
        <Button href="/dashboard/events/new">+ Event Baru</Button>
      </div>

      <Card className="px-6 py-14 text-center sm:px-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-warm">
          <CalendarDays className="h-5 w-5 text-accent" aria-hidden />
        </div>
        <p className="mt-5 font-display text-2xl text-text-primary">
          Belum ada momen yang terabadikan.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
          Buat event pertama, upload frame kustom, dan bagikan QR code-nya ke
          tamu.
        </p>
        <Button href="/dashboard/events/new" className="mt-6">
          Buat Event Pertama
        </Button>
      </Card>

      <Card className="flex flex-col items-center gap-4 px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="font-display text-lg text-text-primary">
            Ingin lihat dulu seperti apa jadinya?
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Buka contoh galeri event dengan data demo.
          </p>
        </div>
        <Button
          href={`/dashboard/events/${DEMO_EVENT_ID}/gallery`}
          variant="secondary"
          size="sm"
        >
          Lihat Contoh Galeri
        </Button>
      </Card>
    </div>
  );
}

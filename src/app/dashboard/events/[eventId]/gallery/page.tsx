import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EventSubNav } from "@/components/dashboard/EventSubNav";
import { PhotoGrid } from "@/components/gallery/PhotoGrid";
import { demoEvent, demoPhotos, DEMO_EVENT_ID } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Galeri Event",
};

type EventGalleryProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventGalleryPage({ params }: EventGalleryProps) {
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
              Galeri event
            </h1>
            <p className="text-sm text-text-secondary">
              Foto tamu milikmu akan terkumpul di sini setelah koneksi database
              siap.
            </p>
          </div>
          <EventSubNav eventId={eventId} />
          <PhotoGrid photos={[]} />
        </>
      ) : (
        <>
          <div className="space-y-1.5">
            <h1 className="font-display text-3xl leading-tight text-text-primary">
              {demoEvent.name}
            </h1>
            <p className="text-sm text-text-secondary">Galeri momen tamu</p>
          </div>

          <EventSubNav eventId={eventId} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-secondary">
              <span className="font-mono font-medium text-text-primary">
                {demoEvent.photoCount}
              </span>{" "}
              momen terkumpul
            </p>
            <Button size="sm" disabled>
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Simpan Semua Momen
            </Button>
          </div>

          <PhotoGrid photos={demoPhotos} />

          <p className="text-center text-xs text-text-secondary">
            Unduh ZIP, lightbox, dan pengelolaan foto aktif setelah integrasi
            storage.
          </p>
        </>
      )}
    </div>
  );
}

export function generateStaticParams() {
  return [{ eventId: DEMO_EVENT_ID }];
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventSubNav } from "@/components/dashboard/EventSubNav";
import { GalleryClient } from "@/components/gallery/GalleryClient";
import { publicStorageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Galeri Event",
};

type EventGalleryProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventGalleryPage({ params }: EventGalleryProps) {
  const { eventId } = await params;

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", eventId)
    .maybeSingle();

  // RLS: event milik vendor lain tidak terlihat → 404.
  if (!event) notFound();

  // Halaman pertama diambil server-side (SSR cepat); sisanya via API.
  // Embed to-one via FK table_id — bentuk runtime object, tipe SDK longgar.
  type PhotoRow = {
    id: string;
    thumb_path: string | null;
    width: number | null;
    height: number | null;
    taken_at: string;
    tables: { label: string } | null;
  };

  const { data: rows, count } = await supabase
    .from("photos")
    .select("id, thumb_path, width, height, taken_at, tables(label)", {
      count: "exact",
    })
    .eq("event_id", eventId)
    .eq("deleted_at", null)
    .order("taken_at", { ascending: false })
    .range(0, 19);

  const initialPhotos = ((rows ?? []) as unknown as PhotoRow[]).map((row) => ({
    id: row.id,
    thumbUrl: row.thumb_path ? publicStorageUrl(row.thumb_path) : null,
    width: row.width,
    height: row.height,
    tableLabel: row.tables?.label ?? null,
    takenAt: row.taken_at,
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/events"
        className="inline-flex text-sm text-text-secondary transition-colors hover:text-accent"
      >
        ← Semua event
      </Link>

      <div className="space-y-1.5">
        <h1 className="font-display text-3xl leading-tight text-text-primary">
          Galeri momen
        </h1>
        <p className="text-sm text-text-secondary">{event.name}</p>
      </div>

      <EventSubNav eventId={eventId} />

      <GalleryClient
        eventId={eventId}
        initialPhotos={initialPhotos}
        total={count ?? initialPhotos.length}
      />
    </div>
  );
}

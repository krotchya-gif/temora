import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { EventStatusButton } from "@/components/admin/EventStatusButton";
import { PhotoDeleteButton } from "@/components/admin/PhotoDeleteButton";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicStorageUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

type PhotoRow = {
  id: string;
  thumb_path: string | null;
  width: number | null;
  height: number | null;
  taken_at: string;
  tables: { label: string } | null;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// Detail event untuk moderasi superadmin (task 018).
export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("id, name, slug, is_active, expires_at, photo_limit, vendor:vendors(name)")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) notFound();

  const typedEvent = event as typeof event & {
    vendor: { name: string } | null;
  };

  const { data: photosData } = await admin
    .from("photos")
    .select("id, thumb_path, width, height, taken_at, tables(label)")
    .eq("event_id", eventId)
    .is("deleted_at", null)
    .order("taken_at", { ascending: false })
    .limit(200);
  const photos = (photosData ?? []) as unknown as PhotoRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/admin/events"
            className="text-xs text-dusty-blue hover:underline"
          >
            ← Semua event
          </Link>
          <h1 className="font-display text-3xl text-text-primary">
            {typedEvent.name}
          </h1>
          <p className="text-sm text-text-secondary">
            Vendor: {typedEvent.vendor?.name ?? "—"} · /{typedEvent.slug} ·
            limit foto {typedEvent.photo_limit ?? "unlimited"}
          </p>
        </div>
        <EventStatusButton
          eventId={typedEvent.id}
          eventName={typedEvent.name}
          isActive={typedEvent.is_active}
        />
      </div>

      <Card className="p-4">
        <p className="text-sm text-text-secondary">
          Moderasi foto — hapus menyembunyikan foto dari galeri vendor dan tamu.
          {photos.length === 0 && " Belum ada foto."}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden p-0">
            {photo.thumb_path ? (
              // eslint-disable-next-line @next/next/no-img-element -- thumb statis publik, tanpa optimizer agar moderasi ringan
              <img
                src={publicStorageUrl(photo.thumb_path)}
                alt={`Foto ${formatDate(photo.taken_at)}`}
                className="aspect-[3/4] w-full bg-bg-warm object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center bg-bg-warm font-mono text-xs text-text-secondary">
                {photo.width ?? "?"}×{photo.height ?? "?"}
              </div>
            )}
            <div className="flex flex-col items-stretch gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="truncate text-xs text-text-secondary">
                {photo.tables?.label ?? "—"}
              </p>
              <PhotoDeleteButton eventId={eventId} photoId={photo.id} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

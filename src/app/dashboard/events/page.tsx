import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EventCard, type EventCardData } from "@/components/dashboard/EventCard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Events",
};

// Data per-sesi vendor — selalu render dinamis, jangan diprerender.
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const supabase = await createClient();

  type EventRow = {
    id: string;
    name: string;
    theme: string | null;
    starts_at: string | null;
    is_active: boolean;
    photos: { count: number }[] | null;
  };

  // RLS e_owner: hanya event milik vendor.
  const { data } = await supabase
    .from("events")
    .select("id, name, theme, starts_at, is_active, photos(count)")
    .order("created_at", { ascending: false });

  const events = ((data ?? []) as unknown as EventRow[]).map<EventCardData>((row) => ({
    id: row.id,
    name: row.name,
    theme: row.theme,
    startsAt: row.starts_at,
    isActive: row.is_active,
    photoCount: row.photos?.[0]?.count ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-text-primary">Events</h1>
          <p className="text-sm text-text-secondary">Kelola semua acara kamu.</p>
        </div>
        <Button href="/dashboard/events/new">+ Event Baru</Button>
      </div>

      {events.length === 0 ? (
        <Card className="px-6 py-14 text-center sm:px-10">
          <p className="font-display text-2xl text-text-primary">
            Belum ada event.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
            Buat event pertama, upload frame kustom, dan bagikan QR code-nya ke
            tamu.
          </p>
          <Button href="/dashboard/events/new" className="mt-6">
            Buat Event Pertama
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

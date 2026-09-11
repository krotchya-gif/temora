import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EventSubNav } from "@/components/dashboard/EventSubNav";
import { QrManager } from "@/components/dashboard/QrManager";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "QR Meja",
};

type EventQrPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventQrPage({ params }: EventQrPageProps) {
  const { eventId } = await params;

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, name, qr_template, qr_title, qr_subtitle, qr_tagline")
    .eq("id", eventId)
    .maybeSingle();

  // RLS: event milik vendor lain terlihat sebagai tidak ada.
  if (!event) notFound();

  const { data: tables } = await supabase
    .from("tables")
    .select("id, label")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

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
          QR Kartu Meja
        </h1>
        <p className="text-sm text-text-secondary">
          Tamu scan QR di meja untuk langsung membuka photobooth.
        </p>
      </div>

      <EventSubNav eventId={eventId} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-secondary">
          <span className="font-mono font-medium text-text-primary">
            {tables?.length ?? 0}
          </span>{" "}
          meja siap dipasang
        </p>
        <Button href={`/print/${eventId}/qr`} variant="secondary" size="sm">
          <Printer className="mr-2 h-4 w-4" aria-hidden />
          Cetak Kartu Meja
        </Button>
      </div>

      <QrManager
        eventId={eventId}
        eventName={event.name}
        qrTemplate={event.qr_template ?? "bloom"}
        qrTitle={event.qr_title}
        qrSubtitle={event.qr_subtitle}
        qrTagline={event.qr_tagline ?? "Keep the moments close."}
        tables={tables ?? []}
      />
    </div>
  );
}

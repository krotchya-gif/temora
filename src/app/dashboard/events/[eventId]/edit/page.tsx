import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { EventForm } from "@/components/dashboard/EventForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Setup Tampilan Event",
};

type EditEventProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EditEventPage({ params }: EditEventProps) {
  const { eventId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tier = (user
    ? ((await supabase
        .from("vendors")
        .select("subscription_tier")
        .eq("id", user.id)
        .maybeSingle())?.data?.subscription_tier ?? "free")
    : "free") as "free" | "basic" | "pro";

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, name, slug, theme, starts_at, ends_at, location, is_active, frame_url, watermark_text, watermark_position, camera_preset, filter_id, filter_strength, qr_template, qr_title, qr_subtitle, qr_tagline",
    )
    .eq("id", eventId)
    .maybeSingle();

  // RLS: event milik vendor lain tidak terlihat.
  if (!event) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/events/${eventId}`}
        className="inline-flex text-sm text-text-secondary transition-colors hover:text-accent"
      >
        ← Detail event
      </Link>

      <div>
        <h1 className="font-display text-3xl text-text-primary">Setup tampilan event</h1>
        <p className="mt-1 font-mono text-xs text-text-secondary">
          /p/{event.slug} · cover, kamera, filter, dan watermark
        </p>
      </div>

      {event.frame_url ? (
        <Card className="flex items-center gap-4 bg-bg-warm p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL publik Supabase Storage */}
          <img
            src={event.frame_url}
            alt="Frame aktif saat ini"
            className="h-16 w-12 rounded-md bg-bg-card object-contain shadow-soft"
          />
          <p className="text-xs leading-relaxed text-text-secondary">
            Frame di atas dipakai di halaman tamu. Unggah PNG baru lewat form di
            bawah untuk menggantinya.
          </p>
        </Card>
      ) : null}

      <Card className="p-6">
        <EventForm
          mode="edit"
          eventId={event.id}
          tier={tier}
          initial={{
            name: event.name,
            theme: event.theme ?? "",
            startsAt: event.starts_at,
            endsAt: event.ends_at,
            location: event.location ?? "",
            isActive: event.is_active,
            watermarkText: event.watermark_text ?? "",
            watermarkPosition: event.watermark_position ?? "bottom-right",
            cameraPreset: event.camera_preset ?? "mono-minimal",
            filterId: event.filter_id,
            filterStrength: Number(event.filter_strength ?? 0.78),
            frameUrl: event.frame_url,
            qrTemplate: event.qr_template ?? "bloom",
            qrTitle: event.qr_title ?? "",
            qrSubtitle: event.qr_subtitle ?? "",
            qrTagline: event.qr_tagline ?? "Keep the moments close.",
          }}
        />
      </Card>
    </div>
  );
}

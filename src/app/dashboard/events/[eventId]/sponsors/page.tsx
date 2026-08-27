import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Handshake } from "lucide-react";
import { EventSubNav } from "@/components/dashboard/EventSubNav";
import { SponsorManager } from "@/components/dashboard/SponsorManager";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sponsor",
};

type SponsorsPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function SponsorsPage({ params }: SponsorsPageProps) {
  const { eventId } = await params;

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, name, vendor_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) notFound();

  const { data: vendor } = await supabase
    .from("vendors")
    .select("subscription_tier")
    .eq("id", event.vendor_id)
    .maybeSingle();
  const isPro = vendor?.subscription_tier === "pro";

  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("id, event_id, name, logo_path, position, is_active, created_at")
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
          Sponsor
        </h1>
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Handshake className="h-4 w-4" aria-hidden />
          Logo partner di frame foto tamu & kartu QR meja — paket Pro.
        </p>
      </div>

      <EventSubNav eventId={eventId} />

      <SponsorManager eventId={eventId} isPro={isPro} sponsors={sponsors ?? []} />
    </div>
  );
}
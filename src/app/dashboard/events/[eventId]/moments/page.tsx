import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircleHeart } from "lucide-react";
import { EventSubNav } from "@/components/dashboard/EventSubNav";
import { MomentsFeed } from "@/components/dashboard/MomentsFeed";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Momen",
};

type MomentsPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function MomentsPage({ params }: MomentsPageProps) {
  const { eventId } = await params;

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) notFound();

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
          Momen
        </h1>
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <MessageCircleHeart className="h-4 w-4" aria-hidden />
          Caption & guestbook digital dari tamu — muncul real-time.
        </p>
      </div>

      <EventSubNav eventId={eventId} />

      <MomentsFeed eventId={eventId} />
    </div>
  );
}
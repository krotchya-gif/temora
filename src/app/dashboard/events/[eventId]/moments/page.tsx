import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventSubNav } from "@/components/dashboard/EventSubNav";
import { MomentWorkspace } from "@/components/dashboard/MomentWorkspace";
import { loadMomentFeed, type MomentFeedPage } from "@/lib/moment-feed";
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

  let initialPage: MomentFeedPage = { items: [], nextCursor: null, total: 0 };
  let initialError: string | null = null;
  try {
    initialPage = await loadMomentFeed(supabase, eventId);
  } catch (error) {
    console.error("[moments.page.feed]", error);
    initialError = "Momen belum bisa dimuat. Coba muat ulang halaman ini ya.";
  }

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
        <p className="text-sm text-text-secondary">
          Foto, cerita, moderasi, dan unduhan event dalam satu tempat.
        </p>
      </div>

      <EventSubNav eventId={eventId} />

      <MomentWorkspace
        eventId={eventId}
        eventName={event.name}
        initialPage={initialPage}
        initialError={initialError}
      />
    </div>
  );
}

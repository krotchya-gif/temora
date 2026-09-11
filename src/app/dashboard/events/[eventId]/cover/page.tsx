import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoverEditor } from "@/components/dashboard/CoverEditor";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit Cover Event" };

export default async function EventCoverPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("id, name, cover_template, cover_image_url, cover_title, cover_subtitle, cover_button_text").eq("id", eventId).maybeSingle();
  if (!event) notFound();

  return <div className="space-y-6">
    <Link href={`/dashboard/events/${eventId}`} className="inline-flex text-sm text-text-secondary transition-colors hover:text-accent">← Detail event</Link>
    <CoverEditor eventId={event.id} eventName={event.name} initial={{ template: event.cover_template ?? "bloom", imageUrl: event.cover_image_url, title: event.cover_title, subtitle: event.cover_subtitle, buttonText: event.cover_button_text ?? "Mulai motret" }} />
  </div>;
}

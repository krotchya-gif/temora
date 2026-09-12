import { redirect } from "next/navigation";

type EventGalleryProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventGalleryPage({ params }: EventGalleryProps) {
  const { eventId } = await params;
  redirect(`/dashboard/events/${eventId}/moments`);
}

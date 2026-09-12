import { redirect } from "next/navigation";

type SponsorsPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function SponsorsPage({ params }: SponsorsPageProps) {
  const { eventId } = await params;
  redirect(`/dashboard/events/${eventId}/edit#sponsor`);
}

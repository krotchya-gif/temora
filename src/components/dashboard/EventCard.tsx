import Link from "next/link";
import { cn } from "@/lib/utils";

export type EventCardData = {
  id: string;
  name: string;
  theme: string | null;
  startsAt: string | null;
  isActive: boolean;
  photoCount: number;
};

const THEME_LABELS: Record<string, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  corporate: "Corporate",
  community: "Community",
  other: "Acara",
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

// EventCard — design-system §3.5.
export function EventCard({ event }: { event: EventCardData }) {
  return (
    <Link
      href={`/dashboard/events/${event.id}`}
      className="block rounded-xl border border-border bg-bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <p className="text-xs uppercase tracking-wide text-dusty-blue">
        {event.theme ? THEME_LABELS[event.theme] ?? "Acara" : "Acara"}
      </p>
      <h3 className="mt-1 font-display text-lg text-text-primary">{event.name}</h3>
      <p className="mt-0.5 text-sm text-text-secondary">
        {[formatDate(event.startsAt), `${event.photoCount} foto`]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <span
        className={cn(
          "mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
          event.isActive
            ? "bg-success/15 text-success"
            : "bg-bg-warm text-text-secondary",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            event.isActive ? "bg-success" : "bg-border",
          )}
        />
        {event.isActive ? "Aktif" : "Nonaktif"}
      </span>
    </Link>
  );
}

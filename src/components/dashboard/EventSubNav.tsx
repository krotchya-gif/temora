"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type EventSubNavProps = {
  eventId: string;
};

export function EventSubNav({ eventId }: EventSubNavProps) {
  const pathname = usePathname();
  const base = `/dashboard/events/${eventId}`;

  const tabs = [
    { href: base, label: "Ringkasan", exact: true },
    { href: `${base}/gallery`, label: "Galeri", exact: false },
  ];

  return (
    <nav
      aria-label="Menu event"
      className="border-b border-border"
    >
      <div className="flex items-center gap-6">
        {tabs.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 py-3 text-sm transition-colors",
                active
                  ? "border-accent font-medium text-accent"
                  : "border-transparent text-text-secondary hover:border-border hover:text-accent",
              )}
            >
              {tab.label}
            </Link>
          );
        })}

        {["QR", "Frame"].map((label) => (
          <span
            key={label}
            aria-disabled
            className="-mb-px flex items-center gap-1.5 border-b-2 border-transparent py-3 text-sm text-text-secondary/50"
          >
            {label}
            <span className="rounded-full bg-bg-warm px-2 py-0.5 text-[11px] text-text-secondary">
              Segera
            </span>
          </span>
        ))}
      </div>
    </nav>
  );
}

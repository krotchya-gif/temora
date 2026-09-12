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
    { href: `${base}/edit`, label: "Setup tampilan", exact: false },
    { href: `${base}/moments`, label: "Momen", exact: false },
    { href: `${base}/qr`, label: "QR", exact: false },
    { href: `${base}/analytics`, label: "Analitik", exact: false },
  ];

  return (
    <nav
      aria-label="Menu event"
      className="border-b border-border print:hidden"
    >
      <div className="grid grid-cols-5 items-stretch sm:flex sm:items-center sm:gap-6">
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
                "-mb-px whitespace-nowrap border-b-2 px-1 py-3 text-center text-[10px] tracking-tight transition-colors sm:px-0 sm:text-left sm:text-sm sm:tracking-normal",
                active
                  ? "border-accent font-medium text-accent"
                  : "border-transparent text-text-secondary hover:border-border hover:text-accent",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

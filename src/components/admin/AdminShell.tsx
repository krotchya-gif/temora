"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/vendors", label: "Vendors", exact: false },
  { href: "/admin/events", label: "Events", exact: false },
  { href: "/admin/showcase", label: "Moments", exact: false },
  { href: "/admin/audit", label: "Audit", exact: false },
];

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-bg-base">
      <header className="border-b border-border bg-bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link
            href="/admin"
            className="font-display text-xl tracking-wordmark text-text-primary"
          >
            {SITE_NAME}
          </Link>
          <span className="rounded-full bg-dusty-blue/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-dusty-blue">
            Admin
          </span>

          <nav aria-label="Menu admin" className="flex items-center gap-1 sm:gap-2">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "min-h-11 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-bg-warm font-medium text-accent"
                      : "text-text-secondary hover:bg-bg-warm hover:text-text-primary",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden />
              Keluar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

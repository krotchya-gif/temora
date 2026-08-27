"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DASHBOARD_NAV, SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const iconMap = {
  layout: LayoutDashboard,
  calendar: CalendarDays,
  credit: CreditCard,
  settings: Settings,
} as const;

type DashboardShellProps = {
  children: React.ReactNode;
  vendorName?: string;
};

export function DashboardShell({
  children,
  vendorName = "Vendor",
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-5">
        <Link
          href="/dashboard"
          className="font-display text-xl tracking-wordmark text-text-primary"
        >
          {SITE_NAME}
        </Link>
        <p className="mt-1 text-xs text-text-secondary">Dashboard vendor</p>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {DASHBOARD_NAV.map((item) => {
          const Icon = iconMap[item.icon];
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                active
                  ? "bg-bg-warm font-medium text-accent"
                  : "text-text-secondary hover:bg-bg-warm hover:text-text-primary",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="truncate text-sm font-medium text-text-primary">{vendorName}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="mt-2 w-full justify-start px-0 text-text-secondary"
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden />
          Keluar
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg-base">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-bg-card lg:block print:hidden">
        {sidebar}
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-text-primary/20 lg:hidden",
          mobileOpen ? "block" : "hidden",
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-bg-card transition-transform duration-200 lg:hidden motion-reduce:transition-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-end p-3">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-bg-warm"
            aria-label="Tutup menu"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1">{sidebar}</div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-border bg-bg-base/90 px-4 backdrop-blur-md sm:px-6 print:hidden">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-bg-warm lg:hidden"
            aria-label="Buka menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="hidden text-sm text-text-secondary lg:block">
            Halo, <span className="font-medium text-text-primary">{vendorName}</span>
          </p>
          <Button href="/dashboard/events/new" size="sm">
            + Event Baru
          </Button>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 print:max-w-none print:p-0">{children}</main>
      </div>
    </div>
  );
}

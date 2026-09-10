"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ScrollText,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", exact: true, icon: LayoutDashboard },
  { href: "/admin/vendors", label: "Vendors", exact: false, icon: Users },
  { href: "/admin/events", label: "Events", exact: false, icon: CalendarDays },
  { href: "/admin/showcase", label: "Moments", exact: false, icon: Images },
  { href: "/admin/audit", label: "Audit", exact: false, icon: ScrollText },
  { href: "/admin/seo", label: "SEO & Analytics", exact: false, icon: Search },
  { href: "/admin/settings", label: "Pengaturan", exact: false, icon: Settings },
];

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const closeMobileMenu = useCallback((restoreFocus = false) => {
    setMobileOpen(false);
    if (restoreFocus) requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMobileMenu(true);
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMobileMenu, mobileOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener("change", handleChange);
    return () => desktop.removeEventListener("change", handleChange);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className="font-display text-xl tracking-wordmark text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
          >
            {SITE_NAME}
          </Link>
          <span className="rounded-full bg-dusty-blue/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-dusty-blue">
            Admin
          </span>
        </div>
        <p className="mt-2 text-xs text-text-secondary">Kontrol platform</p>
      </div>

      <nav aria-label="Menu admin" className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue motion-reduce:transition-none",
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
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full justify-start text-text-secondary"
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden />
          {loggingOut ? "Keluar…" : "Keluar"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg-base">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-bg-card lg:block">
        {sidebar}
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-text-primary/20 transition-opacity duration-200 lg:hidden motion-reduce:transition-none",
          mobileOpen ? "visible opacity-100" : "invisible pointer-events-none opacity-0",
        )}
        onClick={() => closeMobileMenu(true)}
        aria-hidden
      />

      <aside
        ref={drawerRef}
        id="admin-mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu admin"
        aria-hidden={!mobileOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-[60] flex w-[min(18rem,calc(100vw-2rem))] flex-col border-r border-border bg-bg-card shadow-card transition-transform duration-200 lg:hidden motion-reduce:transition-none",
          mobileOpen
            ? "visible translate-x-0"
            : "invisible pointer-events-none -translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-end border-b border-border p-2">
          <button
            ref={closeButtonRef}
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-warm hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue motion-reduce:transition-none"
            aria-label="Tutup menu admin"
            onClick={() => {
              closeMobileMenu(true);
            }}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1">{sidebar}</div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-bg-card/95 backdrop-blur-md lg:hidden">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/admin"
                className="truncate font-display text-xl tracking-wordmark text-text-primary"
              >
                {SITE_NAME}
              </Link>
              <span className="shrink-0 rounded-full bg-dusty-blue/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-dusty-blue">
                Admin
              </span>
            </div>
            <button
              ref={menuButtonRef}
              type="button"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-warm hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue motion-reduce:transition-none"
              aria-label="Buka menu admin"
              aria-controls="admin-mobile-menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

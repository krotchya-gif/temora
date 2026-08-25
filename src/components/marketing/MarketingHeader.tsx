import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/how-it-works", label: "Cara Kerja" },
  { href: "/pricing", label: "Harga" },
  { href: "/login", label: "Masuk" },
];

type MarketingHeaderProps = {
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
};

export function MarketingHeader({
  mobileOpen = false,
  onMobileToggle,
}: MarketingHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg-base/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-xl tracking-wordmark text-text-primary transition-opacity hover:opacity-80"
        >
          {SITE_NAME}
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-text-secondary transition-colors hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
          <Button href="/signup" size="sm">
            Mulai Gratis
          </Button>
        </nav>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-text-primary hover:bg-bg-warm md:hidden"
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={mobileOpen}
          onClick={onMobileToggle}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          "border-t border-border bg-bg-base md:hidden",
          mobileOpen ? "block" : "hidden",
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 sm:px-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-warm hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
          <Button href="/signup" className="mt-2 w-full">
            Mulai Gratis
          </Button>
        </nav>
      </div>
    </header>
  );
}

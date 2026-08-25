import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

const footerLinks = [
  { href: "/how-it-works", label: "Cara Kerja" },
  { href: "/pricing", label: "Harga" },
  { href: "/privacy", label: "Privasi" },
  { href: "/terms", label: "Syarat" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-bg-warm">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-3">
            <p className="font-display text-2xl tracking-wordmark text-text-primary">
              {SITE_NAME}
            </p>
            <p className="text-sm leading-relaxed text-text-secondary">
              {SITE_TAGLINE}
              <br />
              Virtual photobooth untuk wedding, ulang tahun, dan acara spesial.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-text-secondary transition-colors hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 border-t border-border/80 pt-6 text-center text-xs text-text-secondary md:text-left">
          © {new Date().getFullYear()} {SITE_NAME}. Keep it close. Keep it TEMORA.
        </div>
      </div>
    </footer>
  );
}

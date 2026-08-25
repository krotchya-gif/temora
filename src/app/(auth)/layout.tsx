import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-base lg:flex-row">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-bg-warm p-10 lg:flex lg:p-14">
        <div className="absolute inset-0 bg-glow-accent" aria-hidden />
        <Link
          href="/"
          className="relative font-display text-2xl tracking-wordmark text-text-primary"
        >
          {SITE_NAME}
        </Link>
        <div className="relative max-w-md space-y-4">
          <h1 className="font-display text-5xl leading-[1.1] text-text-primary">
            Keep the moments close.
          </h1>
          <p className="text-base leading-relaxed text-text-secondary">
            Kelola event, frame kustom, QR meja, dan galeri foto tamu, semua
            dari satu dashboard yang hangat dan mudah.
          </p>
        </div>
        <p className="relative text-sm text-text-secondary">{SITE_TAGLINE}</p>
      </div>

      <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="mb-8 inline-block font-display text-xl tracking-wordmark text-text-primary lg:hidden"
          >
            {SITE_NAME}
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}

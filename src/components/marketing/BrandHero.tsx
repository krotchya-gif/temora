"use client";

import Link from "next/link";
import { Camera, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandHero() {
  return (
    <section className="relative flex min-h-[calc(100dvh-73px)] items-center justify-center overflow-hidden bg-bg-base px-5 py-16 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-glow-accent" aria-hidden />
      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        <h1 className="sr-only">Keep The Moments Close.</h1>
        <button
          type="button"
          aria-label="Jelajahi TEMORA"
          className="group relative min-h-44 min-w-[min(86vw,30rem)] rounded-[2rem] px-8 py-12 outline-none transition-transform duration-500 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-dusty-blue motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          <span className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 opacity-0 transition-all duration-500 group-hover:-translate-y-4 group-hover:opacity-100 group-focus-visible:-translate-y-4 group-focus-visible:opacity-100 motion-reduce:transition-none">
            <span className="relative block rounded-2xl border border-text-primary/10 bg-bg-card p-4 shadow-card">
              <Camera className="h-12 w-12 text-text-primary" strokeWidth={1.5} aria-hidden />
              <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-accent-secondary" aria-hidden />
            </span>
          </span>
          <span className="pointer-events-none absolute left-1/2 top-12 h-16 w-16 -translate-x-1/2 rounded-full border border-accent-secondary/40 opacity-0 transition-all duration-500 group-hover:scale-150 group-hover:opacity-100 group-focus-visible:scale-150 group-focus-visible:opacity-100 motion-reduce:transition-none" aria-hidden />
          <span aria-hidden className="relative block font-display text-7xl tracking-[0.08em] text-text-primary sm:text-9xl">
            TEMORA
          </span>
          <span className="mt-3 block text-xs uppercase tracking-[0.28em] text-text-secondary">
            Keep the moments close.
          </span>
        </button>

        <p className="mt-5 max-w-md text-sm leading-relaxed text-text-secondary sm:text-base">
          Virtual photobooth untuk wedding, party, dan setiap momen yang ingin kamu simpan dekat.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue",
            )}
          >
            Buat event gratis
            <Sparkles className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="#cara-kerja"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-warm hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
          >
            Lihat cara kerja
            <ChevronDown className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <p className="mt-12 text-[11px] uppercase tracking-[0.2em] text-text-secondary/70">
          Arahkan cursor ke logo
        </p>
      </div>
    </section>
  );
}

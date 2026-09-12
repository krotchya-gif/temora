"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera, ChevronDown, Sparkles } from "lucide-react";
import { GUEST_PLACEHOLDER_PHOTO, GuestPhoneMockup } from "@/components/photobooth/GuestPhoneMockup";
import { cn } from "@/lib/utils";

export function BrandHero() {
  return (
    <section className="relative flex min-h-[calc(100dvh-73px)] items-center justify-center overflow-hidden bg-bg-base px-4 py-12 sm:px-8 sm:py-16">
      <div className="pointer-events-none absolute inset-0 bg-glow-accent" aria-hidden />
      <div className="relative z-10 grid w-full max-w-6xl min-w-0 items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <h1 className="sr-only">Keep The Moments Close.</h1>
          <button
            type="button"
            aria-label="Jelajahi TEMORA"
            className="group relative min-h-0 w-full max-w-full rounded-[2rem] px-0 py-6 text-center outline-none transition-transform duration-500 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-dusty-blue motion-reduce:transition-none motion-reduce:hover:scale-100 sm:min-h-44 sm:px-8 sm:py-12 lg:min-w-0 lg:px-0 lg:text-left"
          >
            <span className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 opacity-0 transition-all duration-500 group-hover:-translate-y-4 group-hover:opacity-100 group-focus-visible:-translate-y-4 group-focus-visible:opacity-100 motion-reduce:transition-none lg:left-0 lg:translate-x-0 lg:group-hover:-translate-y-4 lg:group-focus-visible:-translate-y-4">
              <span className="relative block rounded-2xl border border-text-primary/10 bg-bg-card p-4 shadow-card">
                <Camera className="h-12 w-12 text-text-primary" strokeWidth={1.5} aria-hidden />
                <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-accent-secondary" aria-hidden />
              </span>
            </span>
            <span className="pointer-events-none absolute left-1/2 top-12 h-16 w-16 -translate-x-1/2 rounded-full border border-accent-secondary/40 opacity-0 transition-all duration-500 group-hover:scale-150 group-hover:opacity-100 group-focus-visible:scale-150 group-focus-visible:opacity-100 motion-reduce:transition-none lg:left-0 lg:translate-x-0" aria-hidden />
            <span aria-hidden className="relative block max-w-full font-display text-[clamp(3.75rem,16vw,6rem)] leading-none tracking-[0.08em] text-text-primary sm:text-9xl lg:text-8xl">
              TEMORA
            </span>
            <span className="mt-3 block text-xs uppercase tracking-[0.28em] text-text-secondary">
              Keep the moments close.
            </span>
          </button>

          <p className="mt-5 w-full max-w-[28rem] px-2 text-sm leading-relaxed text-text-secondary sm:text-base">
            Virtual photobooth untuk wedding, party, dan setiap momen yang ingin kamu simpan dekat.
          </p>

          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className={cn(
                "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue sm:w-auto",
              )}
            >
              Buat event gratis
              <Sparkles className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="#cara-kerja"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-warm hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue sm:w-auto"
            >
              Lihat cara kerja
              <ChevronDown className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <p className="mt-8 hidden text-[11px] uppercase tracking-[0.2em] text-text-secondary/70 md:block">
            Arahkan cursor ke logo
          </p>
        </div>

        <div className="relative mx-auto w-[min(72vw,18rem)] max-w-full lg:hidden" aria-label="Preview guest camera TEMORA">
          <div className="absolute -inset-8 rounded-full border border-accent-secondary/20" aria-hidden />
          <GuestPhoneMockup
            title="party dirumah"
            subtitle="berakhir 15.00"
            imageUrl={GUEST_PLACEHOLDER_PHOTO}
            imageAlt="Contoh foto hangat di guest camera TEMORA"
            imageStyle={{ filter: "saturate(0.92) sepia(0.12) contrast(1.02)" }}
            badge="Daydream · 78%"
            caption="Tampilan tamu · preview"
            animate
            className="w-full"
          />
        </div>

        <div className="relative hidden w-full max-w-lg items-center justify-center justify-self-end animate-fade-up motion-reduce:animate-none lg:flex" aria-label="Preview pengalaman virtual photobooth TEMORA">
          <div className="absolute inset-[12%] rounded-full bg-accent-secondary/10 blur-3xl" aria-hidden />
          <Image
            src="/images/temora-product-mockup-v2.png"
            alt="Dua ponsel dengan guest camera TEMORA, kamera instan, cetakan foto, dan strip momen dari sebuah pesta"
            width={1254}
            height={1254}
            priority
            sizes="(min-width: 1280px) 512px, (min-width: 1024px) 48vw, 0px"
            className="relative h-auto w-full animate-product-float object-contain motion-reduce:animate-none"
          />
        </div>
      </div>
    </section>
  );
}

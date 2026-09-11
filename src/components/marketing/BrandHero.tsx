"use client";

import Link from "next/link";
import { useState } from "react";
import { Camera, ChevronDown, Images, Sparkles, SwitchCamera, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandHero() {
  const [logoVideoFailed, setLogoVideoFailed] = useState(false);

  return (
    <section className="relative flex min-h-[calc(100dvh-73px)] items-center justify-center overflow-hidden bg-bg-base px-5 py-16 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-glow-accent" aria-hidden />
      <div className="relative z-10 grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-20">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <h1 className="sr-only">Keep The Moments Close.</h1>
          <button
            type="button"
            aria-label="Jelajahi TEMORA"
            className="group relative min-h-44 min-w-[min(86vw,30rem)] rounded-[2rem] px-8 py-12 text-center outline-none transition-transform duration-500 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-dusty-blue motion-reduce:transition-none motion-reduce:hover:scale-100 lg:min-w-0 lg:px-0 lg:text-left"
          >
            <span className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 opacity-0 transition-all duration-500 group-hover:-translate-y-4 group-hover:opacity-100 group-focus-visible:-translate-y-4 group-focus-visible:opacity-100 motion-reduce:transition-none lg:left-0 lg:translate-x-0 lg:group-hover:-translate-y-4 lg:group-focus-visible:-translate-y-4">
              <span className="relative block rounded-2xl border border-text-primary/10 bg-bg-card p-4 shadow-card">
                <Camera className="h-12 w-12 text-text-primary" strokeWidth={1.5} aria-hidden />
                <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-accent-secondary" aria-hidden />
              </span>
            </span>
            <span className="pointer-events-none absolute left-1/2 top-12 h-16 w-16 -translate-x-1/2 rounded-full border border-accent-secondary/40 opacity-0 transition-all duration-500 group-hover:scale-150 group-hover:opacity-100 group-focus-visible:scale-150 group-focus-visible:opacity-100 motion-reduce:transition-none lg:left-0 lg:translate-x-0" aria-hidden />
            <span className="relative mx-auto flex min-h-44 w-[min(88vw,32rem)] items-center justify-center lg:mx-0" aria-label="TEMORA">
              <span
                aria-hidden
                className={cn(
                  "font-display text-7xl tracking-[0.08em] text-text-primary sm:text-9xl lg:text-8xl",
                  !logoVideoFailed && "sr-only motion-reduce:not-sr-only",
                )}
              >
                TEMORA
              </span>
              {!logoVideoFailed && (
                <video
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain mix-blend-multiply motion-reduce:hidden"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-hidden="true"
                  onError={() => setLogoVideoFailed(true)}
                >
                  <source src="/brand/temora-logo-reveal.mp4" type="video/mp4" />
                </video>
              )}
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

        <div className="relative mx-auto w-[min(68vw,18rem)] lg:mx-0 lg:justify-self-end" aria-label="Preview guest camera TEMORA" role="img">
          <div className="absolute -inset-8 rounded-full border border-accent-secondary/20" aria-hidden />
          <div className="animate-phone-float relative aspect-[9/19] rounded-[2.4rem] border-[7px] border-text-primary bg-text-primary p-1.5 shadow-card motion-reduce:animate-none">
            <div className="relative h-full overflow-hidden rounded-[1.9rem] bg-text-primary text-bg-base">
              <div className="absolute left-1/2 top-2 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-black/80" aria-hidden />
              <div className="absolute inset-x-4 top-10 z-10 flex items-start justify-between text-[9px] text-white/90">
                <span><span className="font-display text-sm">party dirumah</span><span className="mt-0.5 block text-[7px] text-white/55">berakhir 15.00</span></span>
                <span className="font-mono tracking-[0.08em]">11 · 09 · 26</span>
              </div>
              <div className="absolute inset-x-3 top-20 bottom-28 overflow-hidden rounded-[1.45rem] bg-bg-warm">
                <div className="absolute inset-0 bg-muted-mauve/20" aria-hidden />
                <div className="absolute -bottom-10 -left-8 h-40 w-40 rounded-full bg-dusty-blue/40" aria-hidden />
                <div className="absolute right-[-2rem] top-12 h-44 w-44 rounded-full bg-accent-secondary/45" aria-hidden />
                <div className="absolute inset-3 rounded-[1.1rem] border border-white/75" aria-hidden />
                <span className="absolute left-5 top-5 rounded-full bg-text-primary/75 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-white">Daydream · 78%</span>
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between text-[8px] font-mono tracking-[0.12em] text-text-primary/80">
                  <span>TEMORA CAM</span>
                  <span>11 09 ’26</span>
                </div>
              </div>
              <div className="absolute inset-x-5 bottom-7 flex items-center justify-between text-white/75">
                <span className="grid h-9 w-9 place-items-center rounded-full border border-white/25"><SwitchCamera className="h-4 w-4" aria-hidden /></span>
                <span className="animate-phone-shutter grid h-14 w-14 place-items-center rounded-full border-4 border-white/20 bg-accent-secondary shadow-soft motion-reduce:animate-none"><Camera className="h-5 w-5 text-text-primary" aria-hidden /></span>
                <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/25"><Images className="h-4 w-4" aria-hidden /><span className="absolute -right-1 -top-1 rounded-full bg-muted-mauve px-1 text-[7px] text-white">10</span></span>
              </div>
              <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-1 text-[7px] uppercase tracking-[0.18em] text-white/50"><Zap className="h-2.5 w-2.5" aria-hidden /> ambil momen</div>
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] uppercase tracking-[0.18em] text-text-secondary/70">Tampilan tamu · preview</p>
        </div>
      </div>
    </section>
  );
}

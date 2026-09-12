"use client";
/* eslint-disable @next/next/no-img-element -- cover image may be a public media URL. */

import { ArrowRight } from "lucide-react";
import type { PhotoboothEvent } from "@/lib/events";

type CoverScreenProps = {
  event: PhotoboothEvent;
  onContinue: () => void;
};

const templateStyles: Record<PhotoboothEvent["coverTemplate"], string> = {
  bloom: "bg-bg-warm text-text-primary",
  rose: "bg-muted-mauve/30 text-text-primary",
  mono: "bg-text-primary text-bg-base",
  night: "bg-accent text-bg-base",
  paper: "bg-bg-card text-text-primary",
};

export function CoverScreen({ event, onContinue }: CoverScreenProps) {
  const title = event.coverTitle?.trim() || event.name;
  const subtitle = event.coverSubtitle?.trim() || "Simpan momenmu versi kamu.";
  const templateClass = templateStyles[event.coverTemplate] ?? templateStyles.bloom;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg-base px-5 py-8">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto w-[min(72vw,240px)] max-w-full rounded-[2.4rem] border-[8px] border-text-primary bg-text-primary p-1.5 shadow-card">
          <div className={`relative aspect-[9/19] overflow-hidden rounded-[2rem] ${templateClass}`}>
            {event.coverImageUrl ? (
              <img src={event.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
            ) : null}
            <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-text-primary/90" aria-hidden />
            <div className="absolute inset-0 bg-bg-base/15" aria-hidden />
            <div className="relative flex h-full flex-col items-center justify-end px-5 pb-9 text-center">
              <p className="max-w-full text-balance font-display text-2xl leading-none">{title}</p>
              <p className="mt-2 max-w-[15rem] text-[10px] leading-relaxed opacity-80">{subtitle}</p>
              <button type="button" onClick={onContinue} className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-text-primary px-4 text-xs font-semibold text-bg-base transition-transform hover:-translate-y-0.5 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue motion-reduce:transform-none">
                {event.coverButtonText || "Mulai motret"}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
              <p className="mt-4 font-display text-sm opacity-60">TEMORA</p>
            </div>
          </div>
        </div>
        <p className="mt-5 text-xs text-text-secondary">Ketuk untuk masuk ke photobooth</p>
      </div>
    </main>
  );
}

/* eslint-disable @next/next/no-img-element -- previews may use remote placeholders, blob URLs, or Storage URLs. */

import type { CSSProperties } from "react";
import { ArrowRight, Camera, Images, SwitchCamera, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export const GUEST_PLACEHOLDER_PHOTO = "/images/guest-camera-placeholder.jpg";

type GuestPhoneMockupProps = {
  variant?: "camera" | "cover";
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  imageAlt?: string;
  imageStyle?: CSSProperties;
  imageOverlayClassName?: string;
  imageOverlayOpacity?: number;
  frameUrl?: string | null;
  badge?: string;
  date?: string;
  watermark?: string | null;
  watermarkPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | string;
  actionLabel?: string;
  remaining?: number | string;
  caption?: string;
  className?: string;
  shellClassName?: string;
  stageClassName?: string;
  animate?: boolean;
};

const watermarkPositions: Record<string, string> = {
  "bottom-right": "bottom-2 right-3 text-right",
  "bottom-left": "bottom-2 left-3 text-left",
  "top-right": "right-3 top-2 text-right",
  "top-left": "left-3 top-2 text-left",
};

export function GuestPhoneMockup({
  variant = "camera",
  title,
  subtitle,
  imageUrl,
  imageAlt = "Foto contoh pada kamera TEMORA",
  imageStyle,
  imageOverlayClassName,
  imageOverlayOpacity = 0,
  frameUrl,
  badge = "Daydream · 78%",
  date = "11 · 09 · 26",
  watermark,
  watermarkPosition = "bottom-right",
  actionLabel = "Mulai motret",
  remaining = 10,
  caption,
  className,
  shellClassName,
  stageClassName,
  animate = false,
}: GuestPhoneMockupProps) {
  const isCover = variant === "cover";

  return (
    <figure className={cn("relative mx-auto max-w-full", className ?? "w-[min(66vw,232px)]")}>
      <span className="absolute -left-[3px] top-[22%] h-[12%] w-1 rounded-l-full bg-text-secondary/60" aria-hidden />
      <span className="absolute -left-[3px] top-[37%] h-[8%] w-1 rounded-l-full bg-text-secondary/60" aria-hidden />
      <span className="absolute -right-[3px] top-[31%] h-[17%] w-1 rounded-r-full bg-text-secondary/60" aria-hidden />
      <div className={cn("relative rounded-[3rem] border-[3px] border-text-secondary/45 bg-text-primary p-[5px] shadow-card", shellClassName, animate && "animate-phone-float motion-reduce:animate-none")}>
        <div className="relative aspect-[9/19] overflow-hidden rounded-[2.6rem] bg-text-primary text-bg-base ring-1 ring-inset ring-white/10">
          <div className="absolute left-1/2 top-2 z-30 flex h-5 w-[42%] -translate-x-1/2 items-center justify-end rounded-full bg-bg-card pr-3" aria-hidden>
            <span className="h-1.5 w-1.5 rounded-full bg-text-primary/70" />
          </div>

          {isCover ? (
            <div className={cn("absolute inset-0 overflow-hidden", stageClassName ?? "bg-bg-warm text-text-primary")}>
              {imageUrl ? <img src={imageUrl} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover opacity-80" style={imageStyle} /> : null}
              <div className="absolute inset-0 bg-bg-base/15" aria-hidden />
              <div className="relative flex h-full flex-col items-center justify-end px-5 pb-9 text-center">
                <p className="max-w-full text-balance font-display text-2xl leading-none">{title}</p>
                <p className="mt-2 max-w-[15rem] text-[10px] leading-relaxed opacity-80">{subtitle}</p>
                <span className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-text-primary px-4 text-xs font-semibold text-bg-base">
                  {actionLabel}<ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
                <p className="mt-4 font-display text-sm opacity-60">TEMORA</p>
              </div>
            </div>
          ) : (
            <>
              <div className="absolute inset-x-4 top-10 z-20 grid grid-cols-[1fr_1.7fr_1fr] items-start gap-1 text-white/90">
                <span className="pt-1 text-[6px] font-semibold tracking-[0.28em]">TEMORA</span>
                <span className="min-w-0 text-center">
                  <span className="block truncate font-display text-[13px] font-semibold leading-none">{title}</span>
                  <span className="mt-1 block truncate text-[6px] text-white/50">{subtitle}</span>
                </span>
                <span className="pt-1 text-right font-mono text-[6px] tracking-[0.08em]">{date}</span>
              </div>

              <div className={cn("absolute inset-x-3 top-[18%] aspect-[3/4] overflow-hidden rounded-[1.25rem] border border-accent-secondary/70", stageClassName ?? "bg-bg-warm")}>
                {imageUrl ? <img src={imageUrl} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" style={imageStyle} /> : <>
                  <div className="absolute inset-0 bg-muted-mauve/20" aria-hidden />
                  <div className="absolute -bottom-10 -left-8 h-40 w-40 rounded-full bg-dusty-blue/40" aria-hidden />
                  <div className="absolute right-[-2rem] top-12 h-44 w-44 rounded-full bg-accent-secondary/45" aria-hidden />
                </>}
                {imageOverlayClassName ? <div className={cn("absolute inset-0", imageOverlayClassName)} style={{ opacity: imageOverlayOpacity }} aria-hidden /> : null}
                {frameUrl ? <img src={frameUrl} alt="Frame event aktif" className="absolute inset-0 z-10 h-full w-full object-contain" /> : <div className="absolute inset-2.5 z-10 rounded-[0.9rem] border border-white/70" aria-hidden />}
                <span className="absolute left-4 top-4 z-20 max-w-[55%] truncate text-[5px] font-semibold uppercase tracking-[0.16em] text-white/80">{badge}</span>
                <div className="absolute inset-x-4 bottom-3 z-20 flex items-end justify-between font-mono text-[5px] tracking-[0.14em] text-white/80">
                  <span>TEMORA CAM</span><span>{date.replaceAll(" · ", " ")}</span>
                </div>
                {watermark ? <p className={cn("absolute z-20 max-w-[72%] truncate text-[6px] text-white/85", watermarkPositions[watermarkPosition] ?? watermarkPositions["bottom-right"])}>{watermark}</p> : null}
                <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center rounded-full bg-text-primary/90 p-0.5 shadow-card" aria-label="Contoh pilihan zoom">
                  {[1, 2, 3, 5].map((level) => <span key={level} className={cn("grid h-7 w-7 place-items-center rounded-full text-[7px] font-semibold", level === 1 ? "bg-bg-base text-text-primary" : "text-bg-base/65")}>{level}{level === 1 ? "×" : ""}</span>)}
                </div>
              </div>

              <div className="absolute inset-x-4 bottom-[14%] grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-2 text-white/75">
                <span className="grid h-9 w-9 place-items-center rounded-full border border-white/25"><Zap className="h-4 w-4" strokeWidth={1.5} aria-hidden /></span>
                <span className="truncate text-center text-[6px] uppercase tracking-[0.24em] text-white/55">Kamera belakang</span>
                <span className="grid h-9 w-9 place-items-center rounded-full border border-white/25"><SwitchCamera className="h-4 w-4" strokeWidth={1.5} aria-hidden /></span>
              </div>
              <div className="absolute inset-x-4 bottom-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-white/75">
                <span className="justify-self-start rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-center"><strong className="block font-mono text-lg leading-none text-accent-secondary">{remaining}</strong><span className="mt-1 block text-[6px] uppercase tracking-[0.18em] text-white/50">Sisa</span></span>
                <span className={cn("grid h-14 w-14 place-items-center rounded-full border-[3px] border-text-primary bg-bg-base shadow-soft ring-2 ring-accent-secondary/55", animate && "animate-phone-shutter motion-reduce:animate-none")}><Camera className="h-4 w-4 text-text-primary" strokeWidth={1.5} aria-hidden /></span>
                <span className="relative grid h-11 w-11 justify-self-end place-items-center rounded-xl border border-white/15 bg-white/5"><Images className="h-4 w-4" strokeWidth={1.5} aria-hidden /></span>
              </div>
            </>
          )}
        </div>
      </div>
      {caption ? <figcaption className="mt-4 text-center text-[11px] uppercase tracking-[0.18em] text-text-secondary/70">{caption}</figcaption> : null}
    </figure>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type LightboxPhoto = {
  id: string;
  alt: string;
  title?: string;
  caption?: string | null;
  polaroidUrl?: string;
  /** Loader signed URL on-demand (bucket photos privat) — cache di dalam. */
  loadFullUrl: (photoId: string) => Promise<string>;
};

type LightboxProps = {
  photos: LightboxPhoto[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

// Lightbox full-size on-demand — grid selalu pakai thumb (task 006 §7).
export function Lightbox({ photos, index, onClose, onNavigate }: LightboxProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const urlCache = useRef(new Map<string, string>());
  const closeRef = useRef<HTMLButtonElement>(null);

  const photo = index !== null ? photos[index] : null;

  useEffect(() => {
    if (!photo) return;
    let alive = true;
    const cached = urlCache.current.get(photo.id);
    if (cached) {
      setUrl(cached);
      return;
    }
    setLoading(true);
    setLoadError(false);
    setUrl(null);
    photo
      .loadFullUrl(photo.id)
      .then((signed) => {
        if (!alive) return;
        urlCache.current.set(photo.id, signed);
        setUrl(signed);
      })
      .catch(() => {
        if (alive) setLoadError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [photo]);

  useEffect(() => {
    if (index === null) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < photos.length - 1) onNavigate(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onClose, onNavigate]);

  if (index === null || !photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-bg-card p-3 shadow-card sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex h-64 w-64 items-center justify-center rounded-xl bg-bg-warm animate-pulse">
            <span className="text-sm text-text-secondary">Menyiapkan…</span>
          </div>
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL runtime
          <img
            src={url}
            alt={photo.alt}
            className="animate-develop mx-auto max-h-[68dvh] w-auto rounded-lg bg-bg-warm shadow-soft"
          />
        ) : loadError ? (
          <div role="alert" className="flex min-h-64 items-center justify-center rounded-xl bg-bg-warm px-8 text-center text-sm text-text-secondary">
            Foto asli belum bisa dibuka. Coba tutup lalu buka lagi.
          </div>
        ) : null}
        <div className="space-y-2 px-1 pb-1 pt-4">
          {photo.title ? (
            <p className="font-display text-2xl text-text-primary">{photo.title}</p>
          ) : null}
          {photo.caption ? (
            <blockquote className="text-sm italic leading-relaxed text-text-secondary">
              “{photo.caption}”
            </blockquote>
          ) : null}
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            {photo.polaroidUrl ? (
              <Button href={photo.polaroidUrl} size="sm" prefetch={false}>
                <Download className="mr-2 h-4 w-4" aria-hidden />
                Unduh Polaroid
              </Button>
            ) : null}
            {url ? (
              <Button href={url} variant="secondary" size="sm" target="_blank" rel="noopener noreferrer" prefetch={false}>
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                Buka Foto Asli
              </Button>
            ) : (
              <Button type="button" variant="secondary" size="sm" disabled>
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                Buka Foto Asli
              </Button>
            )}
          </div>
        </div>
      </div>

      <button
        ref={closeRef}
        type="button"
        aria-label="Tutup pratinjau"
        onClick={onClose}
        className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      {index > 0 ? (
        <button
          type="button"
          aria-label="Momen sebelumnya"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(index - 1);
          }}
          className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
      ) : null}
      {index < photos.length - 1 ? (
        <button
          type="button"
          aria-label="Momen berikutnya"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(index + 1);
          }}
          className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dusty-blue"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      ) : null}

    </div>
  );
}

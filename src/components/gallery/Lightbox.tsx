"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type LightboxPhoto = {
  id: string;
  alt: string;
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
  const urlCache = useRef(new Map<string, string>());

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
    setUrl(null);
    photo
      .loadFullUrl(photo.id)
      .then((signed) => {
        if (!alive) return;
        urlCache.current.set(photo.id, signed);
        setUrl(signed);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [photo]);

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
      <div className="relative max-h-full max-w-3xl">
        {loading ? (
          <div className="flex h-64 w-64 items-center justify-center rounded-xl bg-bg-warm animate-pulse">
            <span className="text-sm text-text-secondary">Menyiapkan…</span>
          </div>
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL runtime
          <img
            src={url}
            alt={photo.alt}
            onClick={(e) => e.stopPropagation()}
            className="animate-develop max-h-[85dvh] w-auto rounded-lg shadow-card"
          />
        ) : null}
      </div>

      <button
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

      <div onClick={(e) => e.stopPropagation()} className="absolute bottom-5">
        <Button href={url ?? "#"} variant="secondary" size="sm" disabled={!url}>
          Buka Ukuran Penuh
        </Button>
      </div>
    </div>
  );
}
